const fileModel = require('../models/fileModel');

const hideFile = async(req, res) => {
    const { id } = req.params;

    try {
        const row = await fileModel.getFileById(id);
        const name = row.filename;
        const newname = name + '_deleted';
        const result = await fileModel.hideFileById(id, newname);
        res.json(result);
    } catch (err) {
        console.error('DB hide error:', err.message);
        res.status(500).json({ error: 'Failed to hide file' });
    }
};

module.exports = { hideFile };
