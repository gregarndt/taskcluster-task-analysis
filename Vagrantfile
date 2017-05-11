Vagrant.configure("2") do |config|
  config.vm.box = "phusion/ubuntu-14.04-amd64"

  config.vm.synced_folder ENV['HOME'], ENV['HOME']

  config.vm.provision "shell", inline: <<-SCRIPT

#! /bin/bash

set -e -v -x

NODE_VERSION=v6.9.1
DOCKER_VERSION=1.12.6-0~ubuntu-trusty

# add docker group and add current user to it
sudo groupadd docker
sudo usermod -a -G docker vagrant

sudo apt-get update -y

[ -e /usr/lib/apt/methods/https ] || {
  apt-get install apt-transport-https
}

# Add docker gpg key and update sources
sudo apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D
sudo sh -c "echo deb https://apt.dockerproject.org/repo ubuntu-trusty main\
> /etc/apt/sources.list.d/docker.list"

## Update to pick up new registries
sudo apt-get update -y

## Install all the packages
sudo apt-get install -y \
    unattended-upgrades \
    docker-engine=$DOCKER_VERSION \
    lvm2 \
    curl \
    build-essential \
    git-core \
    pbuilder \
    python-mock \
    python-configobj \
    python-support \
    cdbs \
    python-pip \
    jq \
    rsyslog-gnutls \
    lxc

# Install node
cd /usr/local/ && \
  curl https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-linux-x64.tar.gz | tar -xz --strip-components 1 && \
  node -v

# Install some necessary node packages
npm install -g yarn


  SCRIPT
end
