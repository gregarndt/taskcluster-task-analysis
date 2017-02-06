import Debug from 'debug';
import path from 'path';
import pg from 'pg';
import monitor from 'taskcluster-lib-monitor';
import config from 'typed-env-config';
import loader from 'taskcluster-lib-loader';
import taskcluster from 'taskcluster-client';
import {Handler} from './handler';

let debug = Debug('taskcluster-analysis:main');

let load = loader({
  cfg: {
    requires: ['profile'],
    setup: ({profile}) => config({profile}),
  },

  monitor: {
    requires: ['process', 'profile', 'cfg'],
    setup: ({process, profile, cfg}) => monitor({
      project: cfg.monitor.component,
      credentials: cfg.taskcluster.credentials,
      mock: profile === 'test',
      process,
    }),
  },

  listener: {
    requires: ['cfg'],
    setup: async ({cfg}) => {
      let queueEvents = new taskcluster.QueueEvents();
      let routingPattern = `route.#`;
      let listener = new taskcluster.PulseListener({
        credentials: cfg.pulse.credentials,
        queueName: cfg.pulse.queueName,
        prefetch: cfg.pulse.prefetch,
      });

      await Promise.all([
        listener.bind(queueEvents.taskPending(routingPattern)),
        listener.bind(queueEvents.taskRunning(routingPattern)),
        listener.bind(queueEvents.taskCompleted(routingPattern)),
        listener.bind(queueEvents.taskFailed(routingPattern)),
        listener.bind(queueEvents.taskException(routingPattern)),
      ]);

      return listener;
    },
  },

  db: {
    requires: ['cfg'],
    setup: ({cfg}) => {
      console.log(cfg.postgresql);
      return new pg.Pool(cfg.postgresql);
    },
  },

  server: {
    requires: ['cfg', 'monitor', 'listener', 'db'],
    setup: async ({cfg, monitor, listener, db}) => {
      let queue = new taskcluster.Queue();

      let handler = new Handler({
        queue,
        listener,
        monitor,
        db,
      });
      handler.start();
    },
  },
}, ['profile', 'process']);

// If this file is executed launch component from first argument
if (!module.parent) {
  load(process.argv[2], {
    profile: process.env.NODE_ENV,
    process: process.argv[2],
  }).catch(err => {
    console.log('Server crashed: ' + err.stack);
    process.exit(1);
  });
}

module.exports = load;
