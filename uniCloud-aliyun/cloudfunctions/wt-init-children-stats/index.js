'use strict';
/**
 * 初始化儿童统计缓存表
 * 用于将历史报告数据同步到缓存表，兼容现有版本
 * 
 * 使用方法：在云函数控制台手动执行一次即可
 */
const db = uniCloud.database();
const dbCmd = db.command;

const REPORT_TABLE = 'wtdb-business-assess-report';     // 报告表
const CHILDREN_TABLE = 'wtdb-business-children';        // 儿童表
const STATS_TABLE = 'wtdb-business-children-stats';     // 统计缓存表

exports.main = async (event, context) => {
    console.log('====== 开始初始化儿童统计缓存表 ======');

    try {
        // 1. 获取所有儿童
        const childrenRes = await db.collection(CHILDREN_TABLE)
            .limit(1000)  // 根据实际数据量调整
            .get();

        if (!childrenRes.data || childrenRes.data.length === 0) {
            return {
                code: 200,
                message: '没有找到儿童数据',
                stats: { total: 0, processed: 0, created: 0, updated: 0 }
            };
        }

        console.log(`找到 ${childrenRes.data.length} 个儿童记录`);

        // 2. 获取所有报告，按 childId 聚合统计
        const reportAggRes = await db.collection(REPORT_TABLE)
            .aggregate()
            .group({
                _id: '$childId',
                reportCount: dbCmd.aggregate.sum(1),
                latestReportTime: dbCmd.aggregate.max('$createTime'),
                latestReportId: dbCmd.aggregate.last('$reportId'),
                classId: dbCmd.aggregate.first('$classId')
            })
            .end();

        console.log(`报告聚合结果: ${reportAggRes.data.length} 条`);

        // 3. 构建报告统计 Map
        const reportStatsMap = new Map();
        reportAggRes.data.forEach(item => {
            reportStatsMap.set(item._id, {
                reportCount: item.reportCount || 0,
                latestReportTime: item.latestReportTime || 0,
                latestReportId: item.latestReportId || '',
                classId: item.classId || ''
            });
        });

        // 4. 获取现有的统计记录
        const existingStatsRes = await db.collection(STATS_TABLE)
            .limit(1000)
            .get();

        const existingStatsMap = new Map();
        existingStatsRes.data.forEach(item => {
            existingStatsMap.set(item.childId, item._id);
        });

        console.log(`现有统计记录: ${existingStatsRes.data.length} 条`);

        // 5. 遍历儿童，创建或更新统计记录
        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors = [];

        for (const child of childrenRes.data) {
            try {
                const childId = child._id;
                const classId = child.class_id || '';
                const reportStats = reportStatsMap.get(childId);

                const statsData = {
                    childId,
                    classId,
                    reportCount: reportStats?.reportCount || 0,
                    latestReportTime: reportStats?.latestReportTime || 0,
                    latestReportId: reportStats?.latestReportId || '',
                    updateTime: Date.now()
                };

                if (existingStatsMap.has(childId)) {
                    // 更新现有记录
                    await db.collection(STATS_TABLE)
                        .doc(existingStatsMap.get(childId))
                        .update(statsData);
                    updated++;
                } else {
                    // 创建新记录
                    await db.collection(STATS_TABLE).add(statsData);
                    created++;
                }

            } catch (err) {
                console.error(`处理儿童 ${child._id} 失败:`, err);
                errors.push({ childId: child._id, error: err.message });
                skipped++;
            }
        }

        const result = {
            code: 200,
            message: '初始化完成',
            stats: {
                total: childrenRes.data.length,
                created,
                updated,
                skipped,
                errors: errors.length > 0 ? errors : undefined
            }
        };

        console.log('====== 初始化完成 ======');
        console.log(JSON.stringify(result, null, 2));

        return result;

    } catch (e) {
        console.error('初始化失败:', e);
        return {
            code: 500,
            message: '初始化失败: ' + e.message
        };
    }
};
