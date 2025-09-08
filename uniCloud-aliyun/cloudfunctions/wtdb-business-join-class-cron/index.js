const db = uniCloud.database();
const usersCollection = db.collection("uni-id-users");
const classMemberCollection = db.collection("wtdb-business-class-member");

exports.main = async function findSchoolUsers(params) {
  try {
    // 1. 查询role数组包含'school'的用户，返回_id和mobile字段
    const schoolResult = await usersCollection
      .where({
        role: db.command.in(["school"]),
      })
      .field({
        _id: true,
        mobile: true,
      })
      .get();

    const schoolUsers = schoolResult.data;
    const result = [];

    // 2. 对每个school用户的mobile进行二次查询和班级成员检查
    for (const schoolUser of schoolUsers) {
      // 查询相同mobile的其他用户
      const sameMobileResult = await usersCollection
        .where({
          mobile: schoolUser.mobile,
        })
        .field({
          _id: true,
        })
        .get();

      // 获取所有相同mobile的用户ID（包括当前school用户）
      const allUserIds = sameMobileResult.data.map((user) => user._id);

      // 检查这些用户是否已经加入班级
      const classMemberResult = await classMemberCollection
        .where({
          user_id: db.command.in(allUserIds),
        })
        .field({
          user_id: true,
          class_id: true,
          role: true,
          code: true,
          join_time: true,
          nickname: true,
        })
        .get();

      // 组织结果数据
      const joinedUsers = classMemberResult.data; // 已经入的班级
      const notJoinedUserIds = allUserIds.filter(
        (userId) => !joinedUsers.some((member) => member.user_id === userId)
      );

      // 只有当有已加入用户且还有未加入用户时才添加到结果中
      if (joinedUsers.length > 0 && notJoinedUserIds.length > 0) {
        notJoinedUserIds.forEach(async (userId) => {
          joinedUsers.forEach(async (joinedUser) => {
            const joinResult = {
              classId: joinedUser.class_id,
              userId: userId,
              role: joinedUser.role,
              code: joinedUser.code ? joinedUser.code : null,
              nickname: joinedUser.nickname,
            };
            // await classMemberCollection.add(joinResult);
            console.log(joinResult);
          });
        });

        result.push({
          schoolUserId: schoolUser._id,
          mobile: schoolUser.mobile,
          allUserIds: allUserIds,
          joinedUsers: joinedUsers,
          notJoinedUserIds: notJoinedUserIds,
          hasAllJoined: notJoinedUserIds.length === 0,
        });
      }
    }

    return {
      code: 0,
      message: "查询成功",
      data: result,
    };
  } catch (error) {
    return {
      code: -1,
      message: "查询失败: " + error.message,
      data: [],
    };
  }
};
