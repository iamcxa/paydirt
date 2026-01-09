// src/goldflow/pipelines/delivery.ts
import type { Pipeline } from '../types.ts';

/**
 * Delivery Pipeline
 *
 * Triggered when Caravan is ready for review.
 * Runs through review gates, creates PR, waits for CI.
 */
export const deliveryPipeline: Pipeline = {
  name: 'delivery',
  trigger: 'status == "ready-for-review"',
  stages: [
    {
      name: 'review-gate-1',
      processor: 'assayer',
      superpowers: ['requesting-code-review'],
      onFail: 'return_to_miner',
    },
    {
      name: 'review-gate-2',
      processor: 'code-review-toolkit',
      superpowers: [],
      onFail: 'return_to_miner',
    },
    {
      name: 'pr-creation',
      processor: 'trail-boss',
      superpowers: ['finishing-a-development-branch'],
      requires: {
        pr_template: '.github/PULL_REQUEST_TEMPLATE.md',
      },
    },
    {
      name: 'ci-gate',
      verifier: 'github-actions',
      onFail: 'return_to_miner',
    },
    {
      name: 'delivered',
      processor: 'sink',
    },
  ],
};
