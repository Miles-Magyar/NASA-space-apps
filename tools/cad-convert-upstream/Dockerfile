FROM node:22-bookworm-slim AS converter

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential ca-certificates curl pkg-config python3 xz-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
RUN curl --fail --show-error --silent --location --retry 3 \
      https://github.com/LibreDWG/libredwg/releases/download/0.14/libredwg-0.14.tar.xz -o release.tar.xz \
    && echo '62ebb73b984f865960f20ed26619ea5f8789d5e3fd088fa40a2598384da81275  release.tar.xz' | sha256sum -c - \
    && tar --extract --xz --file release.tar.xz --strip-components=1 \
    && ./configure --enable-release --disable-bindings --disable-docs --disable-shared CFLAGS="-O1 -g0" \
    && make -C src -j2 \
    && make -C programs dwg2dxf

FROM node:22-bookworm-slim
WORKDIR /app

COPY --from=converter /build/programs/dwg2dxf /usr/local/bin/dwg2dxf
COPY server.mjs ./
RUN dwg2dxf --version

ENV CAD_CONVERT_BIN=/usr/local/bin/dwg2dxf \
    CAD_CONVERT_UPSTREAM_HOST=0.0.0.0

EXPOSE 8787
USER node
CMD ["node", "server.mjs"]
