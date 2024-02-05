const std = @import("std");

pub fn build(b: *std.Build) void {
    const exe = b.addExecutable(.{
        .name = "store",
        .root_source_file = .{ .path = "src/store.zig" },
        .optimize = .ReleaseSmall,

        .target = b.resolveTargetQuery(.{
            .os_tag = .freestanding,
            .cpu_arch = .wasm32,

            .cpu_features_add = std.Target.Cpu.Feature.feature_set_fns(
                std.Target.wasm.Feature,
            ).featureSet(&[_]std.Target.wasm.Feature{.simd128}),
        }),
    });

    exe.entry = .disabled;
    exe.rdynamic = true;

    const install_exe = b.addInstallArtifact(exe, .{
        .dest_dir = .{ .override = .{ .custom = "../lib" } },
    });

    b.getInstallStep().dependOn(&install_exe.step);
}
