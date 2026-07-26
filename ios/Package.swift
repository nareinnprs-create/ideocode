// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "IDEOCODEKit",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
    ],
    products: [
        .library(name: "IDEOCODEKit", targets: ["IDEOCODEKit"])
    ],
    targets: [
        .target(
            name: "IDEOCODEKit",
            swiftSettings: [.enableUpcomingFeature("StrictConcurrency")]
        ),
        .testTarget(
            name: "IDEOCODEKitTests",
            dependencies: ["IDEOCODEKit"]
        ),
    ]
)
