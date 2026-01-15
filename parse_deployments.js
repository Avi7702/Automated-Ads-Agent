const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
const deployments = data.data.deployments.edges;

console.log('Recent deployments:\n');
deployments.forEach((d, i) => {
  const node = d.node;
  const date = new Date(node.createdAt);
  console.log(`${i+1}. ${node.id}`);
  console.log(`   Status: ${node.status}`);
  console.log(`   Created: ${date.toISOString()}`);
  console.log(`   Branch: ${node.meta?.branch || 'N/A'}`);
  console.log('');
});
