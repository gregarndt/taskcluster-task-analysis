import Debug from 'debug';
import parseRoute from './util/route_parser';

let debug = Debug('taskcluster-analysis:task');

// Filters the task routes for the treeherder specific route.  Once found,
// the route is parsed into distinct parts used for constructing the
// Treeherder job message.
function parseRouteInfo(task) {
  let matchingRoutes = task.routes.filter((r) => {
    return r.split('.')[0] === 'tc-treeherder';
  });

  if (matchingRoutes.length != 1) {
    return {
      origin: undefined,
      owner: undefined,
      project: undefined,
      revision: undefined,
      pushId: undefined,
    };
  }

  let parsedRoute = parseRoute(matchingRoutes[0]);

  if (!parsedRoute.owner) {
    parsedRoute.owner = task.taskStatus.metadata.owner;
  }

  return parsedRoute;
}

export class Task {
  constructor(taskStatus, pulseMessage) {
    this.taskStatus = taskStatus;
    this.routes = taskStatus.routes;
    this.taskId = pulseMessage.payload.status.taskId;
    this.runId = pulseMessage.payload.runId;
    this.message = pulseMessage;
    this.currentRun = pulseMessage.payload.status.runs[this.runId];
    this.source = parseRouteInfo(this);
    return;
  }

  get jobKind() {
    if (this.taskStatus.extra) {
      if (this.taskStatus.extra.treeherder) {
        return this.taskStatus.extra.treeherder.jobKind;
      }
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

    let label = '';
    if (this.taskStatus.extra.treeherder.collection) {
      let label = 'debug';
      if (this.taskStatus.extra.treeherder.collection.opt) {
        label = 'opt';
      }
    } else {
      debug('task does not have a treeherder.collection', this.taskStatus.extra.treeherder);
    }

    let platform = 'unknown';
    if (this.taskStatus.extra.treeherder.machine &&
        this.taskStatus.extra.treeherder.machine.platform) {
      platform = this.taskStatus.extra.treeherder.machine.platform;
    }

    if (label) {
      return this.taskStatus.extra.treeherder.machine.platform + ' ' + label;
    } else {
      return this.taskStatus.extra.treeherder.machine.platform;
    }
  }
}
