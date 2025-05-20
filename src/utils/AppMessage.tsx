import { message } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type { NoticeType } from 'antd/es/message/interface';

let messageInstance: MessageInstance;

message.config({
  duration: 2,
  maxCount: 3,
});

export function setMessageInstance(instance: MessageInstance) {
  messageInstance = instance;
}

export function showMessage(type: NoticeType, content: string, key?: string) {
  if (messageInstance) {
    messageInstance.open({
      type,
      content,
      key,
    });
  } else {
    message[type](content);
  }
}
