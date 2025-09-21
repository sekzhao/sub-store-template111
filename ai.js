function main({ proxies }) {
  const regions = ['HK', 'JP', 'US', 'SG', 'TW', 'KR', 'DE', 'FR'];
  const groups = [];

  if (!proxies || proxies.length === 0) {
    console.log('未检测到任何节点');
    return {
      outbounds: [],
      proxy_groups: []
    };
  }

  regions.forEach(region => {
    const nodes = proxies.filter(p => p.name.toUpperCase().includes(region));
    if (nodes.length > 0) {
      const names = nodes.map(n => n.name);
      groups.push({ type: 'selector', tag: `${region}-select`, outbounds: names });
      groups.push({
        type: 'urltest',
        tag: `${region}-auto`,
        outbounds: names,
        url: 'http://cp.cloudflare.com/generate_204',
        interval: 300,
        tolerance: 50,
        concurrency: 10
      });
      groups.push({
        type: 'fallback',
        tag: `${region}-fallback`,
        outbounds: names,
        url: 'http://cp.cloudflare.com/generate_204',
        interval: 300,
        concurrency: 10
      });
      groups.push({
        type: 'load-balance',
        tag: `${region}-balance`,
        outbounds: names,
        strategy: 'round-robin'
      });
    }
  });

  const allNames = proxies.map(p => p.name);
  groups.push({
    type: 'urltest',
    tag: 'GLOBAL-AUTO',
    outbounds: allNames,
    url: 'http://cp.cloudflare.com/generate_204',
    interval: 300,
    tolerance: 50,
    concurrency: 20
  });

  return {
    outbounds: proxies,
    proxy_groups: groups
  };
}
