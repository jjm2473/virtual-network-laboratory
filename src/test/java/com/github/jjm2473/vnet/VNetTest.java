package com.github.jjm2473.vnet;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.apache.commons.io.IOUtils;
import org.testng.annotations.Test;

public class VNetTest {
    @Test
    public void testBuild() throws IOException {
        String json = IOUtils.resourceToString("test.json", StandardCharsets.UTF_8, VNetTest.class.getClassLoader());
        VNet vNet = VNet.fromJson(json);
        System.out.println(vNet.script());
    }

    public static void main(String[] argv) throws IOException {
        new VNetTest().testBuild();
    }
}