import type { Workflow, PublicWorkflow, InputSchema } from '../../../types.js';
import { resolveInputValuesToSchema } from '../inputs/index.js';
import { getPublicSteps } from './set-public-steps.js';

export function getPublicWorkflows({
  workflows,
  inputs,
  env = {},
}: {
  workflows: Workflow[];
  inputs: Record<string, string>;
  env: Record<string, string>;
}): Record<string, PublicWorkflow> {
  const publicWorkflows = {} as Record<string, PublicWorkflow>;

  for (const workflow of workflows) {
    const workflowInputSchema = workflow.inputs;
    const mergedInputs = mergeWorkflowInputs({ inputs, workflowInputSchema, env });

    publicWorkflows[workflow.workflowId] = {
      steps: getPublicSteps(workflow.steps || []),
      inputs: workflowInputSchema ? mergedInputs : undefined,
      // the runner sets the evaluated outputs once the workflow has run
      outputs: undefined,
    };
  }

  return publicWorkflows;
}

export function mergeWorkflowInputs({
  inputs,
  workflowInputSchema,
  env,
  onInvalidInputs,
}: {
  inputs: Record<string, string> | undefined;
  workflowInputSchema: InputSchema | undefined;
  env: Record<string, string> | undefined;
  onInvalidInputs?: (problems: string) => void;
}) {
  if (!workflowInputSchema) {
    return {};
  }

  const resolvedDotEnvInputs = workflowInputSchema.properties?.env
    ? resolveInputValuesToSchema(env || {}, workflowInputSchema.properties.env as InputSchema)
    : {};

  const hasResolvedEnv = Object.keys(resolvedDotEnvInputs).length > 0;
  const mergedInputs = hasResolvedEnv ? { ...inputs, env: resolvedDotEnvInputs } : inputs;

  if (
    onInvalidInputs &&
    workflowInputSchema.properties?.env &&
    !hasResolvedEnv &&
    !Object.prototype.hasOwnProperty.call(inputs ?? {}, 'env')
  ) {
    const problems: string[] = [];
    const resolvedInputs = resolveInputValuesToSchema(
      mergedInputs,
      workflowInputSchema,
      (problem) => problems.push(problem)
    );
    // Check omitted env separately without changing the returned inputs or root validation.
    resolveInputValuesToSchema(
      { env: {} },
      { type: 'object', properties: { env: workflowInputSchema.properties.env } },
      (problem) => problems.push(problem)
    );
    if (problems.length > 0) {
      onInvalidInputs(problems.join(', '));
    }
    return resolvedInputs;
  }

  return resolveInputValuesToSchema(mergedInputs, workflowInputSchema, onInvalidInputs);
}
