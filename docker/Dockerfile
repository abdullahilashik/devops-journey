
FROM jenkins/jenkins:lts-jdk21

USER root

# Install Docker CLI
RUN apt-get update \
    && apt-get install -y --no-install-recommends docker.io \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

USER jenkins
