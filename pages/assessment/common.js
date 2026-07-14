export default {
    ageDisplay: (ageTS) => {
        const timestamp = ageTS;
        if (isNaN(timestamp)) {
            return uni.showToast({ title: '学生数据异常', icon: 'none' });
        }

        const birthDate = new Date(timestamp);
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        if (today.getDate() < birthDate.getDate()) months--;
        if (months < 0) {
            years--;
            months += 12;
        }
        return `${years}岁${months}个月`
    },
    formatDate(timestamp) {
        const date = new Date(timestamp);
        return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
    }
}
