# AWS EC2 releases

The AWS release path builds one immutable frontend image and one immutable API
image, deploys them to demo, and optionally promotes those exact image tags to
production after demo succeeds.

## Environment map

| Environment | Instance | Database | Public URL |
| --- | --- | --- | --- |
| Demo | `i-00910a357e4f1901a` | `nventoryboss-demo-db` | `https://demo.nventoryboss.com` |
| Production | `i-0bf136cbc79920266` | `nventoryboss-db` | `https://app.nventoryboss.com` |

The database URLs and JWT secrets stay on their respective instances in
`/opt/nventoryboss/deploy/environment`; they are not promoted with an application
release. Database migrations run before the new containers are started.

## Current rollout status

Demo release `0.2.0` is deployed and serving public traffic. Its containers
listen on host port `18080`; the existing host Nginx listener on port `8080`
proxies ALB traffic to that Docker stack. Production has not been migrated to
this release process yet.

## One-time AWS setup

1. Create a customer-managed IAM policy from
   `iam/aws/deployer-policy.json` and attach it to `nventoryboss-deployer` in
   addition to the existing ECR push policy.
2. Create a customer-managed IAM policy from
   `iam/aws/demo-instance-ecr-policy.json` and attach it to the
   `nventoryboss-demo-ec2-role` role. Production already has ECR read access.
3. On each instance, create `/opt/nventoryboss/deploy`, copy `compose.yaml` and
   `deploy.sh` there, and create `environment` from `environment.example`.
   Set file mode `600` on `environment` and executable mode on `deploy.sh`.
   This step is already complete on demo; do not repeat it or replace its
   environment file.
4. Demo uses `WEB_BIND_ADDRESS=0.0.0.0` and `WEB_PORT=18080`, with host Nginx
   proxying ALB port `8080` to the container. Keep `127.0.0.1` on production,
   where Caddy terminates public HTTPS.
5. Configure the production Caddy site for both `nventoryboss.com` and
   `app.nventoryboss.com` before adding the new DNS record. After the marketing
   site is ready, remove the apex hostname from this application site.

Do not replace an existing instance environment file during routine releases.

## GitHub setup

Create GitHub environments named `aws-build`, `demo`, and `production`. Add the
following secrets (environment or repository scope as appropriate):

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `API_REPOSITORY_TOKEN` (only required if the API repository is private)

Add required reviewers to the `production` environment. Run the **Release to
AWS** workflow with a new release tag and the API git reference. ECR tag
immutability prevents an existing release from being silently overwritten.

Longer term, replace stored AWS access keys with GitHub's AWS OIDC integration.

## DNS transition

Add `app.nventoryboss.com` as an A record to the production Elastic IP
`18.211.42.74` with a 300-second TTL. Keep the current apex record in place
until the marketing site is deployed and verified. That makes the final apex
cutover independent from the application migration and gives each change a
simple rollback.
