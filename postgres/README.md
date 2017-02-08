To run a docker container with postgres, build this image and run it:

```
docker build -t taskcluster/task-analysis-postgres .
docker run --name taskcluster-analysis-db -e POSTGRES_PASSWORD=seekrit -p 5555:5432 taskcluster/task-analysis-postgres:latest
```

From there you can connect to it with an application or using psql:

```
psql -h localhost -p 5555 -U postgres
```
