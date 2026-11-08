FROM jenkins/jenkins:lts

USER root

# Download and install the official standalone Docker CLI binary
RUN curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-27.4.0.tgz -o docker.tgz && \
    tar xzvf docker.tgz && \
    cp docker/docker /usr/local/bin/ && \
    rm -rf docker docker.tgz

USER jenkins