// controllers/tableController.js
const TableModel = require('../models/tableModel');
const fileModel = require('../models/fileModel');
const miniTableService = require('../services/miniTableService');
const tableService = require('../services/tableService');
const QcCheckService = require('../services/qcCheckService');



class TableController {


  static async getMiniTableData(req, res) {
    console.log('dsvhsduiahlv');
    try {
      const { file_id, element } = req.query;
      const solution_label= await QcCheckService.getSolutionLabelsForFile(file_id);


      if (!file_id || !solution_label || !element) {
        return res.status(400).json({
          success: false,
          message: 'file_id, solution_label, and element are required'
        });
      }

      const data = await miniTableService.getMiniTableForElement(
        parseInt(file_id),
        solution_label,
        element
      );
      // console.log("🚀 Sending mini table response:", data);

      return res.json({
        success: true,
        miniTable: data
      });

    } catch (error) {
      console.error('[TableController] Error in getMiniTableData:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get mini table data',
        error: error.message
      });
    }
  }


  // Get QC table data by file ID
  static async getTableDataByFile(req, res) {
    try {
      const { file_id } = req.query;

      const solution_label= await QcCheckService.getSolutionLabelsForFile(file_id);


      if (!file_id) {
        return res.status(400).json({
          success: false,
          message: 'file_id is required'
        });
      }

      const solutionLabel = solution_label || 'QC MES 5 ppm';

      const result = await tableService.getQCTableData(parseInt(file_id), solutionLabel);

      if (!result.tableData || result.tableData.length === 0) {
        return res.json({
          success: true,
          message: result.message || 'No data found',
          tableData: [],
          elements: [],
          solutionLabel: result.solutionLabel
        });
      }

      res.json({
        success: true,
        tableData: result.tableData,
        elements: result.elements,
        solutionLabel: result.solutionLabel
      });

    } catch (error) {
      console.error('[TableController] Error fetching QC table data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch QC table data',
        error: error.message
      });
    }
  }


  // Get sample table data by file ID
  // static async getSampleTableDataByFile(req, res) {
  //   try {
  //     const { file_id } = req.query;

  //     if (!file_id) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'file_id is required'
  //       });
  //     }

  //     console.log(`[TableController] Fetching sample table data for file_id: ${file_id}`);

  //     const result = await TableModel.getSampleTableData(parseInt(file_id));

  //     if (!result.tableData || result.tableData.length === 0) {
  //       return res.json({
  //         success: true,
  //         message: result.message || 'No sample data found for this file',
  //         tableData: [],
  //         elements: [],
  //         totalSamples: 0,
  //         fileInfo: result.fileInfo || null,
  //         sampleLabels: []
  //       });
  //     }

  //     res.json({
  //       success: true,
  //       tableData: result.tableData,
  //       elements: result.elements,
  //       totalSamples: result.totalSamples,
  //       fileInfo: result.fileInfo,
  //       sampleLabels: result.sampleLabels,
  //       summary: {
  //         totalElements: result.tableData.length,
  //         averageRSD: result.tableData.length > 0 
  //           ? parseFloat((result.tableData.reduce((sum, item) => sum + item.rsd, 0) / result.tableData.length).toFixed(2))
  //           : 0,
  //         dataRangeStats: {
  //           minRange: result.tableData.length > 0 ? Math.min(...result.tableData.map(item => item.dataRange)) : 0,
  //           maxRange: result.tableData.length > 0 ? Math.max(...result.tableData.map(item => item.dataRange)) : 0,
  //           avgRange: result.tableData.length > 0 
  //             ? parseFloat((result.tableData.reduce((sum, item) => sum + item.dataRange, 0) / result.tableData.length).toFixed(3))
  //             : 0
  //         }
  //       }
  //     });

  //   } catch (error) {
  //     console.error('[TableController] Error fetching sample table data:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to fetch sample table data',
  //       error: error.message
  //     });
  //   }
  // }

  // Get table data by date range
  static async getTableDataByDateRange(req, res) {
    try {
      const { start_date, end_date, solution_label } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'start_date and end_date are required'
        });
      }

      const solutionLabel = solution_label || 'QC_MES_5 ppm';

      console.log(`[TableController] Fetching table data for date range: ${start_date} to ${end_date}, solution_label: ${solutionLabel}`);

      const result = await TableModel.getQCTableDataByDateRange(start_date, end_date, solutionLabel);

      if (!result.tableData || result.tableData.length === 0) {
        return res.json({
          success: true,
          message: result.message || 'No data found for the specified date range',
          tableData: [],
          elements: [],
          solutionLabel: solutionLabel,
          totalSamples: 0,
          dateRange: { start_date, end_date },
          filesIncluded: []
        });
      }

      res.json({
        success: true,
        tableData: result.tableData,
        elements: result.elements,
        solutionLabel: result.solutionLabel,
        totalSamples: result.totalSamples,
        dateRange: result.dateRange,
        filesIncluded: result.filesIncluded,
        summary: {
          totalElements: result.tableData.length,
          elementsWithinTolerance: result.tableData.filter(item => item.isWithinTolerance).length,
          elementsExcellentQuality: result.tableData.filter(item => item.qualityStatus === 'Excellent').length,
          elementsGoodQuality: result.tableData.filter(item => item.qualityStatus === 'Good').length,
          averageRSD: result.tableData.length > 0
            ? parseFloat((result.tableData.reduce((sum, item) => sum + item.rsd, 0) / result.tableData.length).toFixed(2))
            : 0,
          averageErrorPercentage: (() => {
            const valid = result.tableData.filter(item => typeof item.errorPercentage === 'number');
            return valid.length > 0
              ? parseFloat((valid.reduce((sum, item) => sum + item.errorPercentage, 0) / valid.length).toFixed(2))
              : 0;
          })(),
          uniqueFilesCount: result.filesIncluded ? result.filesIncluded.length : 0
        }
      });

    } catch (error) {
      console.error('[TableController] Error fetching table data by date range:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch table data by date range',
        error: error.message
      });
    }
  }

  // Get available solution labels for dropdown
  // Get available solution labels for dropdown

  static async getSolutionLabelsForTable(req, res) {
    try {
      const { file_id } = req.query;

      if (!file_id) {
        return res.status(400).json({
          success: false,
          message: 'file_id is required'
        });
      }

      console.log(`[TableController] Fetching solution labels for file_id: ${file_id}`);

      const result = await qcCheckService.getSolutionLabelsForFile(file_id);

      console.log('✅ Returning allowedLabels:', result.solutionLabels);

      return res.json({
        success: true,
        solutionLabels: result.solutionLabels,
        summary: result.summary
      });

    } catch (error) {
      console.error('[TableController] Error fetching solution labels:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch solution labels',
        error: error.message
      });
    }
  }


  // Get comprehensive file summary
  static async getFileSummary(req, res) {
    try {
      const { file_id } = req.query;

      if (!file_id) {
        return res.status(400).json({
          success: false,
          message: 'file_id is required'
        });
      }

      console.log(`[TableController] Fetching file summary for file_id: ${file_id}`);

      const result = await TableModel.getFileSummary(parseInt(file_id));

      res.json({
        success: true,
        ...result,
        message: 'File summary retrieved successfully'
      });

    } catch (error) {
      console.error('[TableController] Error fetching file summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch file summary',
        error: error.message
      });
    }
  }

  // Get detailed element statistics for a specific element
  static async getElementDetails(req, res) {
    try {
      const { file_id, element_name, solution_label, data_type } = req.query;

      if (!file_id || !element_name) {
        return res.status(400).json({
          success: false,
          message: 'file_id and element_name are required'
        });
      }

      const solutionLabel = solution_label || 'QC_MES_5 ppm';
      const dataType = data_type || 'qc'; // 'qc' or 'sample'

      console.log(`[TableController] Fetching element details for element: ${element_name}, file_id: ${file_id}, data_type: ${dataType}`);

      // Get the appropriate data based on type
      let result;
      if (dataType === 'sample') {
        result = await TableModel.getSampleTableData(parseInt(file_id));
      } else {
        result = await TableModel.getQCTableData(parseInt(file_id), solutionLabel);
      }

      // Find the specific element data
      const elementData = result.tableData.find(item =>
        item.element === element_name || item.fullColumnName === element_name
      );

      if (!elementData) {
        return res.json({
          success: true,
          message: `Element '${element_name}' not found in ${dataType} data`,
          elementData: null
        });
      }

      // Enhanced element details response
      res.json({
        success: true,
        elementData: {
          ...elementData,
          dataType: dataType,
          fileInfo: result.fileInfo,
          analysisDate: new Date().toISOString(),
          qualityMetrics: {
            precision: elementData.rsd <= 5 ? 'High' : elementData.rsd <= 10 ? 'Medium' : 'Low',
            accuracy: elementData.isWithinTolerance ? 'Within Tolerance' : 'Outside Tolerance',
            consistency: elementData.qualityStatus,
            dataQuality: this.assessDataQuality(elementData)
          }
        },
        recommendations: this.generateRecommendations(elementData),
        message: `Detailed analysis for element '${element_name}' retrieved successfully`
      });

    } catch (error) {
      console.error('[TableController] Error fetching element details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch element details',
        error: error.message
      });
    }
  }

  // Helper method to assess overall data quality
  static assessDataQuality(elementData) {
    const rsd = elementData.rsd;
    const withinTolerance = elementData.isWithinTolerance;
    const sampleCount = elementData.sampleCount;

    let score = 0;
    let factors = [];

    // RSD scoring
    if (rsd <= 2) { score += 40; factors.push('Excellent precision (RSD ≤ 2%)'); }
    else if (rsd <= 5) { score += 30; factors.push('Good precision (RSD ≤ 5%)'); }
    else if (rsd <= 10) { score += 20; factors.push('Acceptable precision (RSD ≤ 10%)'); }
    else { score += 5; factors.push('Poor precision (RSD > 10%)'); }

    // Accuracy scoring
    if (withinTolerance) { score += 30; factors.push('Within error tolerance'); }
    else { score += 0; factors.push('Outside error tolerance'); }

    // Sample size scoring
    if (sampleCount >= 10) { score += 20; factors.push('Adequate sample size (n ≥ 10)'); }
    else if (sampleCount >= 5) { score += 15; factors.push('Moderate sample size (n ≥ 5)'); }
    else { score += 5; factors.push('Small sample size (n < 5)'); }

    // Data range scoring
    if (elementData.distributionData && elementData.distributionData.length > 0) {
      score += 10;
      factors.push('Complete distribution data available');
    }

    return {
      score: score,
      grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D',
      factors: factors,
      overall: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor'
    };
  }

  // Helper method to generate recommendations
  // static generateRecommendations(elementData) {
  //   const recommendations = [];

  //   if (elementData.rsd > 10) {
  //     recommendations.push({
  //       type: 'precision',
  //       priority: 'high',
  //       message: 'High RSD indicates poor precision. Check sample preparation consistency and instrument stability.'
  //     });
  //   }

  //   if (!elementData.isWithinTolerance) {
  //     recommendations.push({
  //       type: 'accuracy',
  //       priority: 'high',
  //       message: 'Values are outside error tolerance. Verify calibration standards and check for systematic errors.'
  //     });
  //   }

  //   if (elementData.sampleCount < 5) {
  //     recommendations.push({
  //       type: 'sample_size',
  //       priority: 'medium',
  //       message: 'Small sample size may not be representative. Consider increasing the number of measurements.'
  //     });
  //   }

  //   if (elementData.qualityStatus === 'Poor') {
  //     recommendations.push({
  //       type: 'quality',
  //       priority: 'high',
  //       message: 'Overall poor quality detected. Review entire analytical procedure and consider method validation.'
  //     });
  //   }

  //   return recommendations;
  // }
}

module.exports = TableController;