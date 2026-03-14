/**
 * mfi_report.routes.js — API ​ສຳ​ລັບ​ດຶງ​ຂໍ້​ມູນ MFI ​ໃສ່​ລາຍ​ງານ
 * 
 * GET /api/mfi/current — ​ດຶງ​ຂໍ້​ມູນ​ສະ​ຖາ​ບັນ​ປັດ​ຈຸ​ບັນ (​ຊື່, ​ລະ​ຫັດ, ​ໂລ​ໂກ້)
 */
const logger = require('../config/logger');
const express = require('express');
const router = express.Router();
const db = require('../models');

// GET /api/mfi/current — ​ດຶງ​ຂໍ້​ມູນ MFI ​ສຳ​ລັບ​ໃສ່​ຫົວ​ລາຍ​ງານ
router.get('/mfi/current', async (req, res) => {
    try {
        // ​ລອງ​ດຶງ​ຈາກ mfi_info ​ກ່ອນ
        const MfiInfo = db['mfi_info'];
        const Organization = db['organizations'];

        let mfiData = null;

        // ​ດຶງ​ຈາກ​ mfi_info (​ຂໍ້​ມູນ​ສະ​ຖາ​ບັນ​ການ​ເງິນ)
        if (MfiInfo) {
            const mfi = await MfiInfo.findOne({ raw: true });
            if (mfi) {
                mfiData = {
                    name: mfi.name__l_a || mfi.name__e_n || '',
                    code: mfi.id || '',
                    logoUrl: null,
                };
            }
        }

        // ​ດຶງ​ໂລ​ໂກ້​ຈາກ organizations
        if (Organization) {
            const org = await Organization.findOne({ raw: true });
            if (org) {
                if (!mfiData) {
                    mfiData = {
                        name: org.name || '',
                        code: org.code || '',
                        logoUrl: org.logo_url || null,
                    };
                } else {
                    mfiData.logoUrl = org.logo_url || null;
                }
            }
        }

        // ​ຖ້າ​ບໍ່​ມີ​ຂໍ້​ມູນ → ​ໃຊ້​ຄ່າ​ເລີ່ມ​ຕົ້ນ
        if (!mfiData) {
            mfiData = {
                name: 'ສະຖາບັນການເງິນ',
                code: 'XXXX-XX',
                logoUrl: null,
            };
        }

        res.json({ success: true, data: mfiData });
    } catch (err) {
        logger.error('MFI info error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
