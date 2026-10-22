#!/usr/bin/env bash
set -Eeuo pipefail

readonly DEPLOY_DIR="${DEPLOY_DIR:-/opt/nventoryboss/deploy}"
readonly COMPOSE_FILE="$DEPLOY_DIR/compose.yaml"
readonly ENV_FILE="$DEPLOY_DIR/environment"
readonly REGION="${AWS_REGION:-us-east-1}"
exec 9>"$DEPLOY_DIR/deploy.lock"
if ! flock -n 9; then
  echo "Another deployment is already running." >&2
  exit 1
fi

if [[ $# -ne 1 || -z "$1" ]]; then
  echo "Usage: $0 <immutable-image-tag>" >&2
  exit 2
fi

readonly NEW_TAG="$1"

if [[ ! -f "$COMPOSE_FILE" || ! -f "$ENV_FILE" ]]; then
  echo "Missing $COMPOSE_FILE or $ENV_FILE" >&2
  exit 1
fi

if [[ ! "$NEW_TAG" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]]; then
  echo "Invalid container image tag: $NEW_TAG" >&2
  exit 2
fi

env_value() {
  local key="$1"
  sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1
}

readonly ECR_REGISTRY="$(env_value ECR_REGISTRY)"
readonly PREVIOUS_TAG="$(env_value IMAGE_TAG)"
readonly HEALTH_PORT="$(env_value WEB_PORT)"
: "${ECR_REGISTRY:?ECR_REGISTRY is required in $ENV_FILE}"
export IMAGE_TAG="$NEW_TAG"

aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull api web migrate
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm migrate
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans api web

if ! curl --fail --silent --show-error --retry 12 --retry-delay 5 \
  --retry-connrefused --retry-all-errors \
  "http://127.0.0.1:${HEALTH_PORT:-8080}/healthz" >/dev/null; then
  echo "Release $NEW_TAG failed its health check." >&2
  if [[ -n "$PREVIOUS_TAG" && "$PREVIOUS_TAG" != "staged-not-deployed" && "$PREVIOUS_TAG" != "$NEW_TAG" ]]; then
    echo "Restoring application containers from $PREVIOUS_TAG (database migrations are not reversed)." >&2
    export IMAGE_TAG="$PREVIOUS_TAG"
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --no-build api web
  fi
  exit 1
fi

sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$NEW_TAG/" "$ENV_FILE"
docker image prune -f --filter "until=168h"
echo "Successfully deployed $NEW_TAG"
