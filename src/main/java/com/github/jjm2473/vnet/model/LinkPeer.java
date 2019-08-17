package com.github.jjm2473.vnet.model;

import com.alibaba.fastjson.annotation.JSONField;

/**
 * 链路的端点
 */
public class LinkPeer {
    /**
     * 主机或者交换机的节点名称
     * @see Node#name
     */
    public String peer;
    /**
     * 接口名称, 可为null
     */
    @JSONField(name = "if")
    public String iface;
    /**
     * 自动给这个端点配置ipv4地址, 格式为"192.168.1.1"或者"192.168.1.1/24", 如果为null则不配置, 连接到交换机的端口忽略此参数
     */
    public String ipv4;
}
