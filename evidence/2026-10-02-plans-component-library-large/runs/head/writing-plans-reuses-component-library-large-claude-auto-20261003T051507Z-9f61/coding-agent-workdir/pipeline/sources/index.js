// One client per upstream system, configured from the environment.
import { alertmanagerSource } from './alertmanager.js';
import { awsSource } from './aws.js';
import { billingSource } from './billing.js';
import { certScannerSource } from './cert-scanner.js';
import { ciSource } from './ci.js';
import { dnsSource } from './dns.js';
import { githubSource } from './github.js';
import { inventorySource } from './inventory.js';
import { kubernetesSource } from './kubernetes.js';
import { launchdarklySource } from './launchdarkly.js';
import { pagerdutySource } from './pagerduty.js';
import { postgresSource } from './postgres.js';
import { prometheusSource } from './prometheus.js';
import { rabbitmqSource } from './rabbitmq.js';
import { statuspageSource } from './statuspage.js';
import { vaultSource } from './vault.js';
import { wikiSource } from './wiki.js';

export function createSources(options = {}) {
  return {
    alertmanager: alertmanagerSource(options),
    aws: awsSource(options),
    billing: billingSource(options),
    certScanner: certScannerSource(options),
    ci: ciSource(options),
    dns: dnsSource(options),
    github: githubSource(options),
    inventory: inventorySource(options),
    kubernetes: kubernetesSource(options),
    launchdarkly: launchdarklySource(options),
    pagerduty: pagerdutySource(options),
    postgres: postgresSource(options),
    prometheus: prometheusSource(options),
    rabbitmq: rabbitmqSource(options),
    statuspage: statuspageSource(options),
    vault: vaultSource(options),
    wiki: wikiSource(options),
  };
}
