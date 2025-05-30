// controllers/graphController.js
const GraphModel = require('../models/graphModel');

class GraphController {
  static async getGraphDataByFileId(req, res) {
    try {
      const fileId = req.query.file_id;
      const solutionLabel = req.query.solution_label || 'QC_MES_5 ppm';
      const startDate = req.query.start_date;
      const endDate = req.query.end_date;

      console.log('Received request for graph data:', { fileId, solutionLabel, startDate, endDate });

      if (!fileId) {
        console.error('Missing file_id in request');
        return res.status(400).json({ 
          error: 'Missing file_id parameter',
          message: 'Please provide a file_id in the query parameters'
        });
      }

      const result = await GraphModel.getGraphDataByFileId(fileId, solutionLabel, startDate, endDate);

      if (result.originalData.length === 0 && result.correctedData.length === 0) {
        console.warn('No data found for the given parameters');
        return res.status(404).json({ 
          error: 'No data found',
          message: `No data found for file_id: ${fileId} with solution: ${solutionLabel}${startDate && endDate ? ` between ${startDate} and ${endDate}` : ''}`
        });
      }

      console.log(`Found data for ${result.elements.length} elements with original and corrected values`);
      
      res.json({
        success: true,
        fileId,
        solutionLabel,
        dateRange: startDate && endDate ? {startDate, endDate} : null,
        elements: result.elements,
        originalGraph: {
          title: `${solutionLabel} - Original Values vs Timestamp${startDate && endDate ? ` (${startDate} to ${endDate})` : ''}`,
          data: result.originalData,
          yAxisLabel: 'Original Values (ppm)',
          type: 'original'
        },
        correctedGraph: {
          title: `${solutionLabel} - Corrected Values vs Timestamp${startDate && endDate ? ` (${startDate} to ${endDate})` : ''}`,
          data: result.correctedData,
          yAxisLabel: 'Corrected Values (ppm)',
          type: 'corrected'
        },
        totalRecords: result.originalData[0]?.data.length || 0
      });

    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to retrieve graph data'
      });
    }
  }

  static async getComparisonGraphData(req, res) {
    try {
      const fileId = req.query.file_id;
      const solutionLabel = req.query.solution_label || 'QC_MES_5 ppm';
      const startDate = req.query.start_date;
      const endDate = req.query.end_date;


      console.log('Received request for comparison graph data:', { fileId, solutionLabel, startDate, endDate  });

      if (!fileId) {
        console.error('Missing file_id in request');
        return res.status(400).json({ 
          error: 'Missing file_id parameter',
          message: 'Please provide a file_id in the query parameters'
        });
      }

      const result = await GraphModel.getGraphDataByFileId(fileId, solutionLabel, startDate, endDate);

      if (result.originalData.length === 0 && result.correctedData.length === 0) {
        console.warn('No data found for the given parameters');
        return res.status(404).json({ 
          error: 'No data found',
          message: `No data found for file_id: ${fileId} with solution: ${solutionLabel}`
        });
      }

      // Format data for easy plotting with comparison
      const comparisonData = result.elements.map(element => {
        const originalSeries = result.originalData.find(d => d.element === element);
        const correctedSeries = result.correctedData.find(d => d.element === element);
        
        return {
          element,
          series: [
            {
              name: `${element} (Original)`,
              type: 'original',
              data: originalSeries?.data || []
            },
            {
              name: `${element} (Corrected)`,
              type: 'corrected', 
              data: correctedSeries?.data || []
            }
          ]
        };
      });

      console.log(`Prepared comparison data for ${result.elements.length} elements`);
      
      res.json({
        success: true,
        fileId,
        solutionLabel,
        dateRange: startDate && endDate ? {startDate, endDate} : null,

        elements: result.elements,
        comparisonData,
        totalRecords: result.originalData[0]?.data.length || 0
      });

    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to retrieve comparison graph data'
      });
    }
  }

  static async getSolutionLabels(req, res) {
    try {
      const fileId = req.query.file_id;

      if (!fileId) {
        return res.status(400).json({ 
          error: 'Missing file_id parameter'
        });
      }

      const labels = await GraphModel.getAllSolutionLabels(fileId);
      
      res.json({
        success: true,
        fileId,
        solutionLabels: labels
      });

    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to retrieve solution labels'
      });
    }
  }

  static async getGraphDataByDateRange(res, req){
    try{
      const startDate = req.query.start_date;
      const endDate = req.query.end_date;
      const solutionLabel = req.query.solution_label || 'QC_MES_5 ppm';

      console.log('Received request for graph data by date range:', { startDate, endDate, solutionLabel });

      if (!startDate || !endDate) {
        console.error('Missing start_date or end_date in request');
        return res.status(400).json({ 
          error: 'Missing date parameters',
          message: 'Please provide both start_date and end_date in the query parameters'
        });
      }
      const result = await GraphModel.getGraphDataByDateRange(startDate, endDate, solutionLabel);

      if( result.originalData.length === 0 && result.correctedData.length === 0) {
        console.warn('No data found for the given date range');
        return res.status(404).json({ 
          error: 'No data found',
          message: `No data found for the date range ${startDate} to ${endDate} with solution: ${solutionLabel}`
        });
      }
      console.log(`Found data for ${result.elements.length} elements with original and corrected values`);

      res.json({
        success: true,
        dateRange: { startDate, endDate },
        solutionLabel,
        elements: result.elements,
        originalGraph: {
          title: `${solutionLabel} - Original Values vs Timestamp (${startDate} to ${endDate})`,
          data: result.originalData,
          yAxisLabel: 'Original Values (ppm)',
          type: 'original'
        },
        correctedGraph: {
          title: `${solutionLabel} - Corrected Values vs Timestamp (${startDate} to ${endDate})`,
          data: result.correctedData,
          yAxisLabel: 'Corrected Values (ppm)',
          type: 'corrected'
        },
        totalRecords: result.originalData[0]?.data.length || 0
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to retrieve date range graph data'
      });
    }  
  }
}

module.exports = GraphController;