export const WECHAT_SUBSCRIBE_TEMPLATE_KEYS = Object.freeze({
  ASSESSMENT_REMINDER: "assessment_reminder",
  REPORT_RESULT: "report_result",
});

const PENDING_DECISIONS_KEY = "wechat_subscribe_pending_decisions";
let templateConfig = null;
let templateConfigPromise = null;

const token = () => uni.getStorageSync("uni_id_token");

const loadPendingDecisions = () => {
  const value = uni.getStorageSync(PENDING_DECISIONS_KEY);
  return Array.isArray(value) ? value : [];
};

const savePendingDecisions = (items) => {
  if (items.length) uni.setStorageSync(PENDING_DECISIONS_KEY, items);
  else uni.removeStorageSync(PENDING_DECISIONS_KEY);
};

const callSubscriptionFunction = (data) =>
  uniCloud.callFunction({
    name: "wtdb-wechat-subscription",
    data: {
      ...data,
      uniIdToken: token(),
    },
  });

export const warmWechatSubscribeConfig = async (force = false) => {
  if (templateConfig && !force) return templateConfig;
  if (templateConfigPromise && !force) return templateConfigPromise;

  templateConfigPromise = callSubscriptionFunction({ action: "config" })
    .then((res) => {
      if (res.result?.code !== 200) {
        throw new Error(res.result?.message || res.result?.msg || "读取微信消息配置失败");
      }
      templateConfig = res.result.data || {};
      return templateConfig;
    })
    .finally(() => {
      templateConfigPromise = null;
    });

  return templateConfigPromise;
};

const saveDecisionToCloud = async (decision) => {
  const res = await callSubscriptionFunction({
    action: "record-decision",
    ...decision,
  });
  if (res.result?.code !== 200) {
    throw new Error(res.result?.message || res.result?.msg || "保存微信订阅选择失败");
  }
  return res.result.data;
};

const queuePendingDecision = (decision) => {
  const items = loadPendingDecisions();
  const key = `${decision.recordId}:${decision.templateKey}`;
  const next = items.filter((item) => `${item.recordId}:${item.templateKey}` !== key);
  next.push(decision);
  savePendingDecisions(next.slice(-20));
};

export const getWechatSubscriptionStatus = async ({ templateKey, recordId }) => {
  const pending = loadPendingDecisions().find(
    (item) => item.recordId === recordId && item.templateKey === templateKey
  );
  if (pending) {
    return { status: pending.nativeResult === "accept" ? "accepted_pending_sync" : pending.nativeResult };
  }

  const res = await callSubscriptionFunction({
    action: "grant-status",
    recordId,
    templateKey,
  });
  if (res.result?.code !== 200) {
    throw new Error(res.result?.message || res.result?.msg || "读取微信订阅状态失败");
  }
  return res.result.data || { status: "not_requested" };
};

export const flushPendingWechatSubscriptionDecisions = async () => {
  const items = loadPendingDecisions();
  if (!items.length || !token()) return;

  const remaining = [];
  for (const item of items) {
    try {
      await saveDecisionToCloud(item);
    } catch (_) {
      remaining.push(item);
    }
  }
  savePendingDecisions(remaining);
};

const requestNativeSubscription = (templateId) =>
  new Promise((resolve) => {
    // #ifdef MP-WEIXIN
    uni.requestSubscribeMessage({
      tmplIds: [templateId],
      success: (result) => resolve({ nativeResult: result[templateId] || "error", result }),
      fail: (error) => resolve({ nativeResult: "error", error }),
    });
    // #endif

    // #ifndef MP-WEIXIN
    resolve({ nativeResult: "unsupported" });
    // #endif
  });

export const requestWechatSubscription = async ({ templateKey, recordId }) => {
  const config = await warmWechatSubscribeConfig();
  const template = config[templateKey];
  if (!template?.enabled || !template.id) {
    return { status: "not_configured", templateKey };
  }

  const native = await requestNativeSubscription(template.id);
  if (native.nativeResult === "unsupported") {
    return { status: "unsupported", templateKey };
  }

  const decision = {
    recordId,
    templateKey,
    nativeResult: native.nativeResult,
  };
  try {
    const saved = await saveDecisionToCloud(decision);
    return { ...saved, native: native.result || native.error };
  } catch (error) {
    queuePendingDecision(decision);
    return {
      status: native.nativeResult === "accept" ? "accepted_pending_sync" : native.nativeResult,
      templateKey,
      native: native.result || native.error,
      error,
    };
  }
};
