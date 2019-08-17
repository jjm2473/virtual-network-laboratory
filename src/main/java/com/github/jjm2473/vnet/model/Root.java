package com.github.jjm2473.vnet.model;

/**
 * 特殊的节点, 表示宿主机, 单例;
 * 蓝图中如果root没定义则自动添加宿主机为root
 */
public class Root extends Node {
    /**
     * 宿主机实例
     */
    public static final Root INSTANCE = new Root();
    private Root() {
        this.name = "root";
    }
}
