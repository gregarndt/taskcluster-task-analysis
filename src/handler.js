import Debug from 'debug';
import taskcluster from 'taskcluster-client';
import _ from 'lodash';
import {Task} from './task';

let events = new taskcluster.QueueEvents();
let debug = Debug('task-analysis:handler');

const EVENT_MAP = {
  [events.taskPending().exchange]: 'pending',
  [events.taskRunning().exchange]: 'running',
  [events.taskCompleted().exchange]: 'completed',
  [events.taskFailed().exchange]: 'failed',
  [events.taskException().exchange]: 'exception',
};

export class Handler {
  constructor(options) {
    this.queue = options.queue;
    this.listener = options.listener;
    this.monitor = options.monitor;
    this.db = options.db;
  }

  async start() {
    debug('Starting handler');

    this.listener.on('message', async (message) => {
      try {
        await this.handleMessage(message);
      } catch (err) {
        console.log(`Error caught when processing message. ${err.message}. ${err.stack}`);
      };
    });
    this.listener.on('error', (error) => {
      console.log(`Error encountered with pulse listener. ${error.stack}`);
      process.exit();
    });
    await this.listener.resume();
    debug('Handler Started');
  }

  async handleMessage(message) {
    let taskId = message.payload.status.taskId;
    debug(`message received for task ${taskId}`);

    let taskStatus = await this.queue.task(taskId);
    let task = new Task(taskStatus, message);

    switch (EVENT_MAP[message.exchange]) {
      case 'pending':
        return await this.handleTaskPending(task);
      case 'running':
        return await this.handleTaskRunning(task);
      case 'completed':
        return await this.handleTaskCompleted(task);
      case 'failed':
        return await this.handleTaskCompleted(task);
      case 'exception':
        return await this.handleTaskException(task);
      default:
        throw new Error(`Unknown exchange: ${message.exchange}`);
    }
  }

  async handleTaskPending(task) {

    debug('current run', task.currentRun);
    await this.db.query(
      'INSERT INTO tasks' +
      ' (task_id, run_id, state, created, source, owner, project,' +
      ' revision, push_id, scheduler, worker_type)' +
      ' VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)' +
      // In case a duplicate pending message is received, ignore the message and
      // do nothing
      ' ON CONFLICT DO NOTHING',
      [
        task.taskId,
        task.runId,
        task.currentRun.state,
        task.taskStatus.created,
        task.source.origin,
        task.source.owner,
        task.source.project,
        task.source.revision,
        task.source.pushId,
        task.taskStatus.schedulerId,
        task.taskStatus.workerType,
      ]
    );

    return;
  }

  async handleTaskRunning(task) {
    /*
    debug('taskid', task.taskId);
    debug('ruId', task.runId);
    debug('repo source', task.source.origin);
    debug('owner', task.source.owner);
    debug('project', task.source.project);
    debug('revision', task.source.revision);

    debug('pushId', task.source.pushId);
    debug('task state', task.currentRun.state);
    debug('time created', task.taskStatus.created);
    */
    debug('current run', task.currentRun);

    await this.db.query(
      'INSERT INTO tasks' +
      ' (task_id, run_id, state, created, scheduled, source, owner, project, ' +
      ' revision, push_id, scheduler, worker_type, worker_id, started)' +
      ' VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)' +
      ' ON CONFLICT ON CONSTRAINT dup_task_run DO UPDATE' +
      ' SET scheduled=EXCLUDED.scheduled, state=EXCLUDED.state, ' +
      ' started=EXCLUDED.started, worker_id=EXCLUDED.worker_id',
      [
        task.taskId,
        task.runId,
        task.currentRun.state,
        task.taskStatus.created,
        task.currentRun.scheduled,
        task.source.origin,
        task.source.owner,
        task.source.project,
        task.source.revision,
        task.source.pushId,
        task.taskStatus.schedulerId,
        task.taskStatus.workerType,
        task.currentRun.workerId,
        task.currentRun.started,
      ]
    );

    return;
  }

  async handleTaskCompleted(task) {

    debug('current run', task.currentRun);
    await this.db.query(
      'INSERT INTO tasks' +
      ' (task_id, run_id, state, created, scheduled, source, owner, project,' +
      ' revision, push_id, scheduler, worker_type, worker_id, started, resolved)' +
      ' VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)' +
      ' ON CONFLICT ON CONSTRAINT dup_task_run DO UPDATE' +
      ' SET scheduled=EXCLUDED.scheduled, state=EXCLUDED.state, ' +
      ' worker_id=EXCLUDED.worker_id, started=EXCLUDED.started, resolved=EXCLUDED.resolved',
      [
        task.taskId,
        task.runId,
        task.currentRun.state,
        task.taskStatus.created,
        task.currentRun.scheduled,
        task.source.origin,
        task.source.owner,
        task.source.project,
        task.source.revision,
        task.source.pushId,
        task.taskStatus.schedulerId,
        task.taskStatus.workerType,
        task.currentRun.workerId,
        task.currentRun.started,
        task.currentRun.resolved,
      ]
    );

    return;
  }

  async handleTaskException(task) {

    debug('current run', task.currentRun);
    await this.db.query(
      'INSERT INTO tasks' +
      ' (task_id, run_id, state, created, scheduled, source, owner, project,' +
      ' revision, push_id, scheduler, worker_type, worker_id, started, resolved, exception_reason)' +
      ' VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)' +
      ' ON CONFLICT ON CONSTRAINT dup_task_run DO UPDATE' +
      ' SET state=EXCLUDED.state, worker_id=EXCLUDED.worker_id, ' +
      ' scheduled=EXCLUDED.scheduled, started=EXCLUDED.started, ' +
      ' resolved=EXCLUDED.resolved, exception_reason=EXCLUDED.exception_reason',
      [
        task.taskId,
        task.runId,
        task.currentRun.state,
        task.taskStatus.created,
        task.currentRun.scheduled,
        task.source.origin,
        task.source.owner,
        task.source.project,
        task.source.revision,
        task.source.pushId,
        task.taskStatus.schedulerId,
        task.taskStatus.workerType,
        task.currentRun.workerId,
        task.currentRun.started,
        task.currentRun.resolved,
        task.currentRun.reasonResolved,
      ]
    );
    return;
  }
}
