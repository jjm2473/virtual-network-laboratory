package com.github.jjm2473.vnet;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.apache.commons.io.FileUtils;

/**
 * 主程序
 */
public class Main {
    public static void main(String[] args) throws IOException {
        if (args.length != 1 || "-h".equals(args[0]) || "--help".equals(args[0]) || "--usage".equals(args[0])) {
            System.err.println("Convert network blueprint to shell script\n"
                + "Usage: "+Main.class.getName()+" network.json");
            System.exit(-1);
        }

        String json = FileUtils.readFileToString(new File(args[0]), StandardCharsets.UTF_8);

        System.out.println(VNet.fromJson(json).script());
    }
}
