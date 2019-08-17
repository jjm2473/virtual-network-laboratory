package com.github.jjm2473.vnet.model;

/**
 * 表示一台主机或者路由器, 相当于Linux中的一个网络命名空间
 */
public class Host extends Node {
    /**
     * 自动配置默认网关地址, 如果为null则不配置
     */
    public String gateway;
}
