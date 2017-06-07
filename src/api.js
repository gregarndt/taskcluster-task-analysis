import API from 'taskcluster-lib-api';

let api = new API({
  title:        'TaskCluster Task Analysis Documentation',
  description: [
    'Taskcluster Task Analysis is a service used to capture task events',
    'and persist them to a database for analysis.  This service can changed and is',
    'only experimentally supported',
  ].join('\n'),
  schemaPrefix: 'http://schemas.taskcluster.net/taskcluster-task-analysis/v1/',
  context: ['cfg', 'db'],
});

module.exports = api;

/** Workers for Worker Group **/
api.declare({
  name:   'listWorkerGroup',
  method: 'get',
  route:  '/workers/:workerGroup',
  query: {
    limit: /^[0-9]+$/,
  },
  output: 'list-worker-group-response.json#',
  stability: API.stability.experimental,
  title: 'List Worker Group',
  description: 'List worker IDs sharing the same `workerGroup` ID',
}, async function(req, res) {
  let workerGroup = req.params.workerGroup;
  let continuation = req.query.continuationToken || null;
  let limit = parseInt(req.query.limit || 100, 10);

  let data = await this.db.query(
    'SELECT distinct(worker_id), started from tasks where worker_group = $1 order by started desc limit $2',
    [workerGroup, limit],
  );

  let result = {
    workerGroup,
    workers: [],
  };
  data.rows.forEach(r => {result.workers.push({workerId: r.worker_id});});

  return res.reply(result);
});
