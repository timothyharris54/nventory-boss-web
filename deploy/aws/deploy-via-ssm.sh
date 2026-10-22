#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <demo|production> <immutable-image-tag>" >&2
  exit 2
fi

readonly ENVIRONMENT="$1"
readonly IMAGE_TAG="$2"
readonly REGION="${AWS_REGION:-us-east-1}"
AWS_ARGS=(--region "$REGION")
if [[ -n "${AWS_PROFILE:-}" ]]; then
  AWS_ARGS+=(--profile "$AWS_PROFILE")
fi

case "$ENVIRONMENT" in
  demo) readonly INSTANCE_ID="i-00910a357e4f1901a" ;;
  production) readonly INSTANCE_ID="i-0bf136cbc79920266" ;;
  *) echo "Unknown environment: $ENVIRONMENT" >&2; exit 2 ;;
esac

if [[ ! "$IMAGE_TAG" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]]; then
  echo "Invalid container image tag: $IMAGE_TAG" >&2
  exit 2
fi

COMMAND_ID="$(aws ssm send-command \
  "${AWS_ARGS[@]}" \
  --instance-ids "$INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --comment "Deploy Nventory Boss $IMAGE_TAG to $ENVIRONMENT" \
  --parameters "commands=[\"sudo /opt/nventoryboss/deploy/deploy.sh '$IMAGE_TAG'\"]" \
  --query 'Command.CommandId' \
  --output text)"
readonly COMMAND_ID

aws ssm wait command-executed \
  "${AWS_ARGS[@]}" \
  --command-id "$COMMAND_ID" \
  --instance-id "$INSTANCE_ID"

aws ssm get-command-invocation \
  "${AWS_ARGS[@]}" \
  --command-id "$COMMAND_ID" \
  --instance-id "$INSTANCE_ID" \
  --query '{Status:Status,Output:StandardOutputContent,Error:StandardErrorContent}'
