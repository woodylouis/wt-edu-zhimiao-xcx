<template>
    <section class="profile-header">
        <img src="https://cdn.builder.io/api/v1/image/assets/022245c9a8b14954aad66a5dc04d83ff/c4fc99747b759ed1866fc92beb731511edc8c445b0a08b8ddaa08eae050479e7?placeholderIfAbsent=true" alt="Profile" class="profile-header__avatar" />
        <div class="profile-header__info">
            <h2 class="profile-header__greeting">下午好，李平平老师</h2>
            <div class="profile-header__class-info">
                <span class="profile-header__class-name">小班3班</span>
                <button class="profile-header__invite-btn">邀请加入本班</button>
            </div>
        </div>
        <div class="profile-header__actions">
            <img src="https://cdn.builder.io/api/v1/image/assets/022245c9a8b14954aad66a5dc04d83ff/7a29b5b264bda8cf4b9c450056830808e98f94e1a44086201a2cb3c69d8653cc?placeholderIfAbsent=true" alt="Action 1" class="profile-header__action-icon" />
            <img src="https://cdn.builder.io/api/v1/image/assets/022245c9a8b14954aad66a5dc04d83ff/6102e498f00463e83308ab866f29a76b1a3feb04cd1ef852f1302413a1d7efb5?placeholderIfAbsent=true" alt="Action 2" class="profile-header__action-icon" />
        </div>
    </section>
</template>

<style scoped>
.profile-header {
    background-color: transparent;
    align-self: stretch;
    display: flex;
    margin-top: 20px;
    padding: 6px 20px;
    align-items: center;
    gap: 20px;
    justify-content: space-between;
}

.profile-header__avatar {
    aspect-ratio: 1;
    object-fit: contain;
    object-position: center;
    width: 44px;
    align-self: stretch;
    margin: auto 0;
}

.profile-header__info {
    align-self: stretch;
    font-family:
        PingFang SC,
        -apple-system,
        Roboto,
        Helvetica,
        sans-serif;
    white-space: nowrap;
}

.profile-header__greeting {
    color: #00214d;
    font-size: 18px;
    font-weight: 600;
    line-height: 1;
}

.profile-header__class-info {
    display: flex;
    margin-top: 4px;
    align-items: stretch;
    gap: 10px;
    font-size: 14px;
    font-weight: 400;
    line-height: 1;
}

.profile-header__class-name {
    color: #3d464a;
    margin: auto 0;
    flex-grow: 1;
}

.profile-header__invite-btn {
    border-radius: 4px;
    background-color: #dbe9ff;
    padding: 2px 4px;
    color: #2a64e9;
    border: none;
    cursor: pointer;
}

.profile-header__actions {
    align-self: stretch;
    display: flex;
    margin: auto 0;
    align-items: stretch;
    gap: 12px;
}

.profile-header__action-icon {
    aspect-ratio: 1;
    object-fit: contain;
    object-position: center;
    width: 36px;
}
</style>