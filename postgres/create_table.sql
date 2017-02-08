CREATE TABLE tasks (
    task_id varchar(22) NOT NULL,
    run_id int NOT NULL,
    state text NOT NULL,
    resolution text,
    exception_reason text,
    created timestamp NOT NULL,
    scheduled timestamp,
    started timestamp,
    resolved timestamp,
    duration int,
    source text,
    owner text,
    project text,
    revision text,
    push_id int,
    scheduler text,
    worker_id text,
    worker_type text,
    platform text,
    job_kind text,
    CONSTRAINT dup_task_run UNIQUE (task_id, run_id)
);