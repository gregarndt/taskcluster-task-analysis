import Debug from 'debug';
import parseRoute from './util/route_parser';
import parseGithubUrl from 'parse-github-url';

let debug = Debug('task-analysis:task');

const DEFAULT_SOURCE = {
  origin: undefined,
  owner: undefined,
  project: undefined,
  revision: undefined,
  pushId: undefined,
};

function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

function determineSourceInformation(task) {
  if (isEmpty(task.taskStatus)) {
    return DEFAULT_SOURCE;
  }

  if (task.taskStatus.schedulerId === 'taskcluster-github') {
    return buildGithubSourceInformation(task.taskStatus.payload);
  }

  return parseRouteInfo(task);
}

function buildGithubSourceInformation(task) {
  try {
    let parsedUrl = parseGithubUrl(task.env.GITHUB_HEAD_REPO_URL);
    return {
      origin: 'github.com',
      owner: parsedUrl.owner,
      project: parsedUrl.name,
      revision: task.env.GITHUB_HEAD_SHA,
    };
  } catch (e) {
    debug('Unable to part task for github information');
    return DEFAULT_SOURCE;
  }
}

// Filters the task routes for the treeherder specific route.  Once found,
// the route is parsed into distinct parts used for constructing the
// Treeherder job message.
function parseRouteInfo(task) {
  let matchingRoutes = task.routes.filter((r) => {
    return r.split('.')[0] === 'tc-treeherder';
  });

  if (matchingRoutes.length != 1) {
    return DEFAULT_SOURCE;
  }

  let parsedRoute = parseRoute(matchingRoutes[0]);

  if (!parsedRoute.owner) {
    parsedRoute.owner = task.taskStatus.metadata.owner;
  }

  return parsedRoute;
}

export class Task {
  constructor(pulseMessage, taskStatus) {
    this.taskStatus = taskStatus;
    this.routes = pulseMessage.routes || [];
    this.taskId = pulseMessage.payload.status.taskId;
    this.runId = pulseMessage.payload.runId;
    this.message = pulseMessage;
    this.currentRun = pulseMessage.payload.status.runs[this.runId];
    this.source = determineSourceInformation(this);
    return;
  }

  get jobKind() {
    if (this.taskStatus.extra && this.taskStatus.extra.treeherder) {
      return this.taskStatus.extra.treeherder.jobKind;
    }

    return;
  }

  get platform() {
    if (!this.taskStatus.extra) {
      return;
    }

    if (!this.taskStatus.extra.treeherder) {
      return;
    }

    let labels = [];
    if (this.taskStatus.extra.treeherder.collection) {
      for (let key of Object.keys(this.taskStatus.extra.treeherder.collection)) {
        if (this.taskStatus.extra.treeherder.collection[key]) {
          labels.push(key);
        }
      }
    }

    let platform = 'unknown';
    if (this.taskStatus.extra.treeherder.machine &&
        this.taskStatus.extra.treeherder.machine.platform) {
      platform = this.taskStatus.extra.treeherder.machine.platform;
    }

    if (labels.length) {
      return platform + ' ' + labels.sort().join(' ');
    } else {
      return platform;
    }
  }
}
