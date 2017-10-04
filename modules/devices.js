var shortid = require('shortid');

var Commons = require('./commons');

var devices = require('../DB/devices.json');
var devicesKeysArray = Commons.GetFilterdKeysByType();

// Recursive function to run on every dd\evie 
// not in parallel
// (because some of devices cant work together)
var InitDevicesData = function (deviceIndex, next) {
    // recursive stop condition
    if (deviceIndex >= devicesKeysArray.length) {
        next()
        return;
    }

    var id = devicesKeysArray[deviceIndex];
    var device = devices[id];

    var brandModuleHandler = Commons.GetBrandModule(device.brand);

    if (brandModuleHandler == null) {
        next('Cant find module that map to brand: ' + device.brand);
        return;
    }


    // Get every device property value by recursion
    var getDeviceProperty = (propertyIndex) => {
        // If finish get current device properties go to next device
        if (propertyIndex >= device.types.length) {
            InitDevicesData(deviceIndex + 1, next);
            return
        }

        switch (device.types[propertyIndex]) {
            case ('switch'):
                brandModuleHandler.GetState(device, (state, err) => {
                    device.state = state;
                    console.log('Device ' + device.name + ' status ' + state);
                    getDeviceProperty(propertyIndex + 1);
                });
                return;
            case ('light'):
                brandModuleHandler.GetBrightnessAndColor(device, (value, err) => {
                    device.light = value;
                    console.log('Device ' + device.name + ' value: bright' + value.bright + ' color' + value.color);
                    getDeviceProperty(propertyIndex + 1);
                });
                return;
            default:
                next('Cant handle unknown type: ' + device.types[propertyIndex])
                return;
        }
    }
    // Start getting device properties
    getDeviceProperty(0);
}


// next =  (isSuccess, err)
var SetDeviceProperty = (id, type, value, next) => {
    var device = devices[id];

    if (!device) {
        next('Cant find device with id: ' + id);
        return;
    } else if (device.types.indexOf(type) == -1) {
        next('Device id: ' + id + ' not supported : ' + type);
        return;
    }
    var brandModuleHandler = Commons.GetBrandModule(device.brand);

    if (brandModuleHandler == null) {
        next('Cant find module that map to brand: ' + device.brand);
        return;
    }

    // Do tryp action 
    switch (type) {
        case ('switch'):
            brandModuleHandler.ChangeState(device, value, (err) => {
                if (err)
                    next(err);
                else {
                    device.state = value;
                    next();
                    PushChanges(id);
                }
            });
            break;
        case ('light'):
            brandModuleHandler.SetBrightnessAndColor(device, value, (err) => {
                if (err)
                    next(err);
                else {
                    device.light = value;
                    next();
                    PushChanges(id);
                }
            });
            break;
        default:
            next('Cant handle unknown type: ' + type)
            return;
    }
};

// next = (device, err)
var GetDevice = (id, next) => {
    next(devices[id]);
};

// next = (devices)
var GetDevices = (next) => {
    next(devices);
};

console.log('Getting devices data...');
InitDevicesData(0, (err) => {
    console.log('Done getting device data');
    if (err)
        console.error(err);
});

var RefreshDevicesData = (next) => {
    InitDevicesData(0, next);
};

// Push changes enents

// callbacks to invoke when event happend
var updateCallbacks = [];

// Update changes in array of switchers 
// and invoke event to registars mathods 
var PushChanges = (id) => {
    updateCallbacks.forEach((registardMethod) => {
        registardMethod(id, devices[id]);
    })
};

// Let registar to change state event
var UpdateChangesEventRegistar = function (callback) {
    updateCallbacks.push(callback);
}

// comments, sse, events, 
module.exports = {
    SetDeviceProperty: SetDeviceProperty,
    GetDevice: GetDevice,
    GetDevices: GetDevices,
    RefreshDevicesData: RefreshDevicesData,
    UpdateChangesEventRegistar: UpdateChangesEventRegistar
};