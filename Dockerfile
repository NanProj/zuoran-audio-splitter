FROM continuumio/miniconda3 as spleeter

WORKDIR /root
ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8

# Update Conda and install Conda packages
RUN \
    conda update -y -n base -c defaults conda && \
    conda install -y -c conda-forge ffmpeg libsndfile

# Install pip and install spleeter
RUN \
    python -m ensurepip --upgrade && \
    pip3 install --upgrade pip && \
    pip3 install spleeter


FROM spleeter as frontend

WORKDIR /root
ENV NODE_VERSION=16.16.0
ENV NVM_DIR=/root/.nvm
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"

# Install curl
RUN \
    apt-get update && \
    apt-get install -y --no-install-recommends curl

# Install node
RUN \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash && \
    . "${NVM_DIR}/nvm.sh" && \
    nvm install ${NODE_VERSION} && \
    nvm alias default ${NODE_VERSION} && \
    nvm use default

# Copy frontend project
WORKDIR /root/frontend
COPY frontend /root/frontend

# Install npm dependencies
RUN \
    . "${NVM_DIR}/nvm.sh" && \
    npm install

# Download spleeter's models by processing example audio
RUN \
    wget https://github.com/deezer/spleeter/raw/master/audio_example.mp3 && \
    spleeter separate -p spleeter:2stems -o output audio_example.mp3 && \
    rm audio_example.mp3 && \
    rm -r output

EXPOSE 80
ENTRYPOINT ["/root/.nvm/versions/node/v16.16.0/bin/node", "/root/frontend/main.js"]
