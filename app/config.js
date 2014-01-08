window.config = {
  VERSION: '<%= pkg.version %>' || '',
  DEMO: Boolean('<%= process.env.DEMO %>') || true,
  DEMO_DELAY: Number('<%= process.env.DEMO_DELAY %>') || 0,
  DEMO_VARIANT: '<%= process.env.DEMO_VARIANT %>' || '',
  DEMO_ENDPOINT: '<%= process.env.DEMO_ENDPOINT %>' || 'demo'
};