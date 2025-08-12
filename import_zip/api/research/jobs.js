module.exports = async (_req, res) => {
  try {
    // TODO: load from DB or memory store
    return res.status(200).json({ jobs: [] });
  } catch (err) {
    console.error('research/jobs error', err);
    return res.status(500).json({ error: 'Failed to load jobs' });
  }
};
