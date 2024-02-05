const std = @import("std");

const Self = @This();

document_embeddings: []f32,
query_results: []QueryResult,
query_embedding: []f32,

const QueryResult = struct { index: i32, distance: f32 };

export fn create(embedding_size: i32, document_count: i32) ?*Self {
    const allocator = std.heap.page_allocator;
    const self = allocator.create(Self) catch return null;

    self.* = init(allocator, @intCast(embedding_size), @intCast(document_count)) catch return null;

    return self;
}

export fn getDocumentEmbeddingsPtr(self: *const Self) [*]f32 {
    return self.document_embeddings.ptr;
}

export fn getQueryEmbeddingPtr(self: *const Self) [*]f32 {
    return self.query_embedding.ptr;
}

export fn getQueryResultsPtr(self: *const Self) [*]QueryResult {
    return self.query_results.ptr;
}

export fn performQuery(self: *const Self) void {
    @setFloatMode(.Optimized);

    const embedding_size = self.query_embedding.len;

    const query_embedding_squared_length = computeDotProduct(
        self.query_embedding,
        self.query_embedding,
    );

    for (self.query_results, 0..) |*query_result, index| {
        const document_embedding =
            self.document_embeddings[index * embedding_size ..][0..embedding_size];

        const document_embedding_squared_length = computeDotProduct(
            document_embedding,
            document_embedding,
        );

        const denominator = std.math.sqrt(
            query_embedding_squared_length * document_embedding_squared_length,
        );

        const cosine_similarity =
            if (denominator == 0) -1 else computeDotProduct(
            self.query_embedding,
            document_embedding,
        ) / denominator;

        query_result.* = .{ .index = @intCast(index), .distance = 1 - cosine_similarity };
    }

    std.mem.sort(QueryResult, self.query_results, {}, sortByDistanceAsc);
}

fn init(allocator: std.mem.Allocator, embedding_size: usize, document_count: usize) !Self {
    return .{
        .document_embeddings = try allocator.alloc(f32, document_count * embedding_size),
        .query_embedding = try allocator.alloc(f32, embedding_size),
        .query_results = try allocator.alloc(QueryResult, document_count),
    };
}

fn computeDotProduct(vector: []const f32, other_vector: []const f32) f32 {
    @setFloatMode(.Optimized);

    std.debug.assert(vector.len == other_vector.len);

    comptime var block_size = 32;

    var result_value: f32 = 0;
    var rest_size = vector.len;

    inline while (block_size >= 1) : (block_size /= 2) {
        if (rest_size >= block_size) {
            for (0..rest_size / block_size) |index| {
                const offset = (vector.len - rest_size) + index * block_size;

                result_value += @reduce(
                    .Add,
                    @as(@Vector(block_size, f32), vector[offset..][0..block_size].*) *
                        @as(@Vector(block_size, f32), other_vector[offset..][0..block_size].*),
                );
            }

            rest_size %= block_size;
        }
    }

    return result_value;
}

fn sortByDistanceAsc(_: void, lhs: QueryResult, rhs: QueryResult) bool {
    return lhs.distance < rhs.distance;
}
