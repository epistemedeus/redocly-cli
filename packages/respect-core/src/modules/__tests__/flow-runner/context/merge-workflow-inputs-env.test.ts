import { mergeWorkflowInputs } from '../../../flow-runner/context/set-public-workflows.js';
const workflowInputSchema = {
  type: 'object',
  properties: {
    search: { type: 'string' },
    env: {
      type: 'object',
      required: ['API_KEY'],
      properties: { API_KEY: { type: 'string' }, REGION: { type: 'string' } },
    },
  },
};
describe('mergeWorkflowInputs env validation', () => {
  it('reports a missing env key when a declared sibling is present', () => {
    const onInvalidInputs = vi.fn();
    const result = mergeWorkflowInputs({
      inputs: { search: 'latte' },
      workflowInputSchema,
      env: { REGION: 'eu' },
      onInvalidInputs,
    });
    expect(result).toEqual({ search: 'latte', env: { REGION: 'eu' } });
    expect(onInvalidInputs).toHaveBeenCalledTimes(1);
    expect(onInvalidInputs.mock.calls[0][0]).toContain("required property 'API_KEY'");
  });
  it.each([{}, { UNDECLARED: 'x' }, undefined])('reports a missing env key with env=%j', (env) => {
    const onInvalidInputs = vi.fn();
    const result = mergeWorkflowInputs({
      inputs: { search: 'latte' },
      workflowInputSchema,
      env,
      onInvalidInputs,
    });
    expect(result).toEqual({ search: 'latte' });
    expect(onInvalidInputs).toHaveBeenCalledTimes(1);
    expect(onInvalidInputs.mock.calls[0][0]).toContain("required property 'API_KEY'");
  });
});

describe('empty env amendment boundaries', () => {
  it('aggregates root and env errors in one warning', () => {
    const warn = vi.fn();
    const result = mergeWorkflowInputs({
      inputs: {},
      workflowInputSchema: { ...workflowInputSchema, required: ['search'] },
      env: {},
      onInvalidInputs: warn,
    });
    expect(result).toEqual({});
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("required property 'search'");
    expect(warn.mock.calls[0][0]).toContain("inputs/env must have required property 'API_KEY'");
  });
  it('does not invent root maxProperties errors for omitted env', () => {
    const warn = vi.fn();
    const result = mergeWorkflowInputs({
      inputs: { search: 'latte' },
      workflowInputSchema: { ...workflowInputSchema, maxProperties: 1 },
      env: {},
      onInvalidInputs: warn,
    });
    expect(result).toEqual({ search: 'latte' });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toBe("inputs/env must have required property 'API_KEY'");
  });
  it('does not warn for valid env', () => {
    const warn = vi.fn();
    expect(
      mergeWorkflowInputs({
        inputs: { search: 'latte' },
        workflowInputSchema,
        env: { API_KEY: 'test' },
        onInvalidInputs: warn,
      })
    ).toEqual({ search: 'latte', env: { API_KEY: 'test' } });
    expect(warn).not.toHaveBeenCalled();
  });
  it('applies env defaults without a warning', () => {
    const warn = vi.fn();
    const schema = {
      type: 'object',
      properties: {
        env: {
          type: 'object',
          required: ['API_KEY'],
          properties: { API_KEY: { type: 'string', default: 'test-default' } },
        },
      },
    };
    expect(
      mergeWorkflowInputs({
        inputs: {},
        workflowInputSchema: schema,
        env: {},
        onInvalidInputs: warn,
      })
    ).toEqual({ env: { API_KEY: 'test-default' } });
    expect(warn).not.toHaveBeenCalled();
  });
  it('preserves the no-callback return', () => {
    expect(
      mergeWorkflowInputs({ inputs: { search: 'latte' }, workflowInputSchema, env: {} })
    ).toEqual({ search: 'latte' });
  });
  it('returns no inputs without a schema', () => {
    const warn = vi.fn();
    expect(
      mergeWorkflowInputs({
        inputs: { search: 'latte' },
        workflowInputSchema: undefined,
        env: {},
        onInvalidInputs: warn,
      })
    ).toEqual({});
    expect(warn).not.toHaveBeenCalled();
  });
  it('preserves an explicitly supplied env input', () => {
    const warn = vi.fn();
    expect(
      mergeWorkflowInputs({
        inputs: { search: 'latte', env: 'explicit' },
        workflowInputSchema,
        env: {},
        onInvalidInputs: warn,
      })
    ).toEqual({ search: 'latte', env: 'explicit' });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toBe('inputs/env must be object');
  });
});
