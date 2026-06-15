FROM mcr.microsoft.com/devcontainers/base:3.0.1-ubuntu26.04

ENV DEBIAN_FRONTEND=noninteractive
ENV BUN_INSTALL=/usr/local/bun
ENV RUSTUP_HOME=/usr/local/rustup
ENV CARGO_HOME=/usr/local/cargo
ENV UV_TOOL_DIR=/opt/uv-tools
ENV UV_TOOL_BIN_DIR=/usr/local/bin
ENV AGY_OAUTH_HOME=/auth/gemini
ENV KIMI_OAUTH_HOME=/auth/kimi-code
ENV PATH="/usr/local/bun/bin:/usr/local/cargo/bin:/opt/uv-tools:${PATH}"

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    zsh \
    git \
    gh \
    curl \
    wget \
    ca-certificates \
    gnupg \
    jq \
    yq \
    ripgrep \
    fd-find \
    shellcheck \
    tmux \
    less \
    unzip \
    zip \
    xz-utils \
    file \
    sudo \
    openssh-client \
    procps \
    lsof \
    tree \
    rsync \
    build-essential \
    pkg-config \
    libssl-dev \
    libsqlite3-dev \
    zlib1g-dev \
    libbz2-dev \
    libreadline-dev \
    libffi-dev \
    liblzma-dev \
    libncurses-dev \
    libxml2-dev \
    libxmlsec1-dev \
    python3 \
    python3-pip \
    python3-venv \
    ruby-full \
    golang-go \
  && ln -sf /usr/bin/fdfind /usr/local/bin/fd \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get update \
  && apt-get install -y --no-install-recommends nodejs \
  && node --version \
  && npm --version \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.sh/install | bash \
  && ln -sf /usr/local/bun/bin/bun /usr/local/bin/bun \
  && bun --version

RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh \
  && uv --version

RUN curl -fsSL https://sh.rustup.rs | sh -s -- -y --no-modify-path --profile minimal \
  && rustc --version \
  && cargo --version

RUN curl -fsSL https://mise.run | MISE_INSTALL_PATH=/usr/local/bin/mise sh \
  && mise --version

RUN npm install -g \
    @anthropic-ai/claude-code \
    @openai/codex \
    @google/gemini-cli \
    opencode-ai \
    @github/copilot \
    @factory/cli \
    @qoder-ai/qodercli \
    @qwen-code/qwen-code \
    @moonshot-ai/kimi-code \
    @kilocode/cli \
    openclaw \
    @sourcegraph/amp \
    @augmentcode/auggie \
    @continuedev/cli \
    cline \
    @mariozechner/pi-coding-agent \
  && if command -v kilocode >/dev/null 2>&1 && ! command -v kilo >/dev/null 2>&1; then ln -s "$(command -v kilocode)" /usr/local/bin/kilo; fi \
  && if command -v factory >/dev/null 2>&1 && ! command -v droid >/dev/null 2>&1; then ln -s "$(command -v factory)" /usr/local/bin/droid; fi \
  && if command -v continue >/dev/null 2>&1 && ! command -v cn >/dev/null 2>&1; then ln -s "$(command -v continue)" /usr/local/bin/cn; fi

RUN mkdir -p /opt/cursor-agent \
  && curl -fsSL https://cursor.com/install | HOME=/opt/cursor-agent bash \
  && cursor_agent_bin="$(find /opt/cursor-agent -type f -name agent -perm -111 | head -n 1)" \
  && test -n "$cursor_agent_bin" \
  && ln -sf "$cursor_agent_bin" /usr/local/bin/agent \
  && ln -sf "$cursor_agent_bin" /usr/local/bin/cursor-agent \
  && agent --version

RUN uv tool install --python 3.12 aider-chat \
  && aider --version

RUN curl -fsSL -o /tmp/goose.deb https://github.com/aaif-goose/goose/releases/download/v1.31.1/goose_1.31.1_amd64.deb \
  && apt-get update \
  && apt-get install -y --no-install-recommends /tmp/goose.deb \
  && rm -f /tmp/goose.deb \
  && rm -rf /var/lib/apt/lists/* \
  && goose --version

COPY container/bin/quorum /usr/local/bin/quorum
COPY container/bin/evals-tool-versions /usr/local/bin/evals-tool-versions
RUN chmod +x /usr/local/bin/quorum /usr/local/bin/evals-tool-versions

WORKDIR /workspace/evals
CMD ["sleep", "infinity"]
