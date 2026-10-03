// Every snapshot job, by snapshot name. run.js runs them all unless given names.
import * as alerts from './alerts.js';
import * as audit from './audit.js';
import * as backups from './backups.js';
import * as capacity from './capacity.js';
import * as certificates from './certificates.js';
import * as changes from './changes.js';
import * as clusters from './clusters.js';
import * as costs from './costs.js';
import * as databases from './databases.js';
import * as deploys from './deploys.js';
import * as domains from './domains.js';
import * as endpoints from './endpoints.js';
import * as flags from './flags.js';
import * as hosts from './hosts.js';
import * as incidents from './incidents.js';
import * as jobs from './jobs.js';
import * as maintenance from './maintenance.js';
import * as oncall from './oncall.js';
import * as queues from './queues.js';
import * as regions from './regions.js';
import * as reports from './reports.js';
import * as runbooks from './runbooks.js';
import * as secrets from './secrets.js';
import * as services from './services.js';
import * as slos from './slos.js';
import * as status from './status.js';
import * as teams from './teams.js';
import * as tokens from './tokens.js';
import * as vendors from './vendors.js';
import * as webhooks from './webhooks.js';

export const JOBS = {
  alerts,
  audit,
  backups,
  capacity,
  certificates,
  changes,
  clusters,
  costs,
  databases,
  deploys,
  domains,
  endpoints,
  flags,
  hosts,
  incidents,
  jobs,
  maintenance,
  oncall,
  queues,
  regions,
  reports,
  runbooks,
  secrets,
  services,
  slos,
  status,
  teams,
  tokens,
  vendors,
  webhooks,
};
