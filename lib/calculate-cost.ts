// Pricing for GPT4-1106 preview
const inputCostPerToken = 0.01 / 1000;
const outputCostPerToken = 0.03 / 1000;

export const calculateCost = (
  inputTokens: number,
  outputTokens: number
): void => {
  const inputCost = inputTokens * inputCostPerToken;
  const outputCost = outputTokens * outputCostPerToken;

  const totalCost = inputCost + outputCost;

  console.log(
    `\x1b[32m>>> The total cost for this API call is $${totalCost.toFixed(
      2
    )}\x1b[0m`
  );
};
