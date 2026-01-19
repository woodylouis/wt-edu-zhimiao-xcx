'use strict';
const db = uniCloud.database();

/**
 * 判断用户是否在学校范围内
 * @param {Object} event - 请求参数
 * @param {number} event.latitude - 用户纬度
 * @param {number} event.longitude - 用户经度
 * @param {string} event.schoolId - 学校ID（school_id 字段）
 * @param {number} [event.radius=500] - 允许的半径范围（米），默认500米
 */
exports.main = async (event, context) => {
    const { latitude, longitude, schoolId, radius = 500 } = event;

    // 参数校验
    if (!latitude || !longitude) {
        return {
            code: 400,
            message: '缺少位置参数',
            data: { inRange: false }
        };
    }

    if (!schoolId) {
        return {
            code: 400,
            message: '缺少学校ID参数',
            data: { inRange: false }
        };
    }

    try {
        // 查询学校位置信息
        const schoolRes = await db.collection('wtdb-business-school-list')
            .where({
                school_id: schoolId
            })
            .field({
                school_id: true,
                name: true,
                latitude: true,
                longitude: true
            })
            .get();

        if (schoolRes.data.length === 0) {
            return {
                code: 404,
                message: '未找到学校信息',
                data: { inRange: false }
            };
        }

        const school = schoolRes.data[0];

        // 检查学校是否设置了位置信息
        if (!school.latitude || !school.longitude) {
            // 学校未设置位置，默认允许
            return {
                code: 200,
                message: '学校未设置位置信息，允许进行测试',
                data: {
                    inRange: true,
                    schoolName: school.name,
                    reason: 'no_location_set'
                }
            };
        }

        // 计算两点间距离（单位：米）
        const distance = calculateDistance(
            latitude,
            longitude,
            school.latitude,
            school.longitude
        );

        const inRange = distance <= radius;

        return {
            code: 200,
            message: inRange ? '您在学校范围内，可以进行测试' : '您不在学校范围内，请到学校后再进行测试',
            data: {
                inRange,
                distance: Math.round(distance),
                radius,
                schoolName: school.name,
                schoolLocation: {
                    latitude: school.latitude,
                    longitude: school.longitude
                }
            }
        };
    } catch (e) {
        console.error('位置检查失败:', e);
        return {
            code: 500,
            message: '服务器错误',
            data: { inRange: false }
        };
    }
};

/**
 * 使用Haversine公式计算两个经纬度坐标之间的距离
 * @param {number} lat1 - 纬度1
 * @param {number} lon1 - 经度1
 * @param {number} lat2 - 纬度2
 * @param {number} lon2 - 经度2
 * @returns {number} 距离（单位：米）
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // 地球半径（米）
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * 角度转弧度
 */
function toRad(deg) {
    return deg * (Math.PI / 180);
}
