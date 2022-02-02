const types = ["", "SUBSCRIPTION_RECOVERED", "SUBSCRIPTION_RENEWED", "SUBSCRIPTION_CANCELED",
    "SUBSCRIPTION_PURCHASED", "SUBSCRIPTION_ON_HOLD", "SUBSCRIPTION_IN_GRACE_PERIOD", "SUBSCRIPTION_RESTARTED",
    "SUBSCRIPTION_PRICE_CHANGE_CONFIRMED", "SUBSCRIPTION_DEFERRED", "SUBSCRIPTION_PAUSED",
    "SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED", "SUBSCRIPTION_REVOKED", "SUBSCRIPTION_EXPIRED"];
const unknownType = "UNKNOWN";


class AndroidNotificationTypes {
    constructor() {
        this.types = types;
    }

    getTypeByInt(idValue) {
        if (0 <= idValue && idValue < this.types.length) {
            return types[idValue];
        }
        return unknownType
    }
}

module.exports = AndroidNotificationTypes;