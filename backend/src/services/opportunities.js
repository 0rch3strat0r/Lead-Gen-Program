export async function createOrGetOpportunity(params){
  const mod = await import('./opportunities.ts');
  return mod.createOrGetOpportunity(params);
}

export async function listOpportunities(clientId, status){
  const mod = await import('./opportunities.ts');
  return mod.listOpportunities(clientId, status);
}

export async function claimOpportunity(params){
  const mod = await import('./opportunities.ts');
  return mod.claimOpportunity(params);
}

export async function updateOpportunityStatus(params){
  const mod = await import('./opportunities.ts');
  return mod.updateOpportunityStatus(params);
}