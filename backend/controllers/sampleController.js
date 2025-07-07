const SampleService = require('../services/sampleService');
const SampleModel = require('../models/sampleModel');



class SampleController{

static getSampleElementDetails = async (req, res) => {
  try {
    const { sampleId, elementName } = req.body;
    const result = await SampleService.getSampleElementDetails(sampleId, elementName);
    res.json(result);
  } catch (error) {
    console.error('Controller Error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

static async getAllSamples(req,res){
  try {
      const rows = await SampleModel.getSamples();
      const transformedFiles = rows.map(sample => ({
        id: sample.sample_id,
        name: sample.sample_name// Map filename to name
        
      }));
      //console.log(transformedFiles);
      
      res.json(transformedFiles);
    } catch (err) {
      console.error('DB fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch files' });
    }

}
static async getSampleTable(req, res) {
  try {
    const sampleId = parseInt(req.query.sampleId, 10);
    console.log("🛠️ Controller received sampleId:", sampleId);

    if (isNaN(sampleId)) {
      return res.status(400).json({ error: 'Invalid or missing sampleId' });
    }

    const result = await SampleService.getSampleTableData(sampleId);

    // ✅ Just send the object directly
    res.json(result); 
  } catch (error) {
    console.error("Error in getSampleTableDataController:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}


}

module.exports = SampleController;
