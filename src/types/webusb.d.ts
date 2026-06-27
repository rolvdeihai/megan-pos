interface Navigator {
  usb?: USB; // properti opsional agar tidak error di browser non-Chrome
}

interface USB {
  getDevices(): Promise<USBDevice[]>;
  requestDevice(options?: USBDeviceRequestOptions): Promise<USBDevice>;
  addEventListener(type: 'connect' | 'disconnect', listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

interface USBDevice {
  vendorId: number;
  productId: number;
  deviceName: string;
  manufacturerName?: string;
  productName?: string;
  serialNumber?: string;
  opened: boolean;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationNumber: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  controlTransferIn(setup: any, length: number): Promise<any>;
  controlTransferOut(setup: any, data?: BufferSource): Promise<any>;
  transferIn(endpointNumber: number, length: number): Promise<any>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<any>;
}

interface USBDeviceRequestOptions {
  filters?: USBDeviceFilter[];
}

interface USBDeviceFilter {
  vendorId?: number;
  productId?: number;
  classCode?: number;
  subclassCode?: number;
  protocolCode?: number;
}