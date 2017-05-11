Warning: This is not a production worthy app.  It's a proof of concept to do analytics
of taskcluser tasks.


This application will bind to the task event exchanges that Taskcluster writes to.  These
messages, along with some additional information from Taskcluster, are transformed
and put into a database for later analysis.


## Running Locally

#### Prerequisites

1. Docker
2. Node 6.x or greater
3. Yarn (npm install -g yarn)
4. Pulse Credentials

#### Building and run Postgres docker container

```

docker build -t taskcluster/task-analysis-postgres ./postgres
docker run --name taskcluster-analysis-db -e POSTGRES_PASSWORD=seekrit -p 5555:5432 taskcluster/task-analysis-postgres:latest

```

This will start a postgresql container with a password and exposed port that are the defaults for the 'test'
profile for this application.


#### Installing application dependencies

```

yarn

```


#### Running application locally

NODE_ENV=\<profile\> PULSE_USERNAME=\<username\> PULSE_PASSWORD=\<password\> node . server

For instance, to run the test configuratino for this application, run:

```

NODE_ENV=test PULSE_USERNAME=<username> PULSE_PASSWORD=<password> node . server

```

