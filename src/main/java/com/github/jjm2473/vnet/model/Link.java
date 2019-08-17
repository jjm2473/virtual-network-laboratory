package com.github.jjm2473.vnet.model;

/**
 * 链路, 对应Linux中的一对虚拟veth设备, 相当于连接了一根网线的两个网卡,
 * from 和 to 代表两个端点连接的主机, 没有先后关系
 */
public class Link {
    public LinkPeer from;
    public LinkPeer to;
}
