import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import { Client } from "basic-ftp";
import SftpClient from "ssh2-sftp-client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FtpUpload } from "../src/index";

// Define mocks using vi.hoisted to ensure they are available for vi.mock factories
const { mockFtpClient, mockSftpClient } = vi.hoisted(() => {
	return {
		mockFtpClient: {
			access: vi.fn(),
			uploadFrom: vi.fn(),
			ensureDir: vi.fn(),
			size: vi.fn().mockResolvedValue(0),
			lastMod: vi.fn().mockResolvedValue(new Date()),
			close: vi.fn(),
		},
		mockSftpClient: {
			connect: vi.fn(),
			put: vi.fn(),
			mkdir: vi.fn(),
			stat: vi.fn().mockResolvedValue({ size: 0, mtime: new Date() }),
			end: vi.fn(),
		},
	};
});

// Mock external dependencies
vi.mock("basic-ftp", () => {
	return {
		// biome-ignore lint/complexity/useArrowFunction: Need constructor
		Client: vi.fn(function () {
			return mockFtpClient;
		}),
	};
});

vi.mock("ssh2-sftp-client", () => {
	return {
		// biome-ignore lint/complexity/useArrowFunction: Need constructor
		default: vi.fn(function () {
			return mockSftpClient;
		}),
	};
});
vi.mock("node:fs");
vi.mock("node:fs/promises");

describe("FtpUpload", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Setup FS mocks
		(fs.statSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			size: 1024,
			mtime: new Date(),
		});

		(
			fsPromises.readdir as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				name: "index.html",
				isDirectory: () => false,
			},
			{
				name: "style.css",
				isDirectory: () => false,
			},
		]);
	});

	it("should upload files using FTP", async () => {
		const options = {
			localDir: "./test",
			remoteDir: "/site/wwwroot",
			host: "ftp.example.com",
			user: "user",
			password: "password",
			mode: "ftp" as const,
			entries: ["index.html"],
		};

		const uploader = new FtpUpload(options);
		await uploader.execute();

		expect(Client).toHaveBeenCalled();
		expect(mockFtpClient.access).toHaveBeenCalledWith(
			expect.objectContaining({
				host: "ftp.example.com",
				user: "user",
				password: "password",
				port: 21,
			}),
		);
		expect(mockFtpClient.uploadFrom).toHaveBeenCalled();
		expect(mockFtpClient.close).toHaveBeenCalled();
	});

	it("should upload files using SSH", async () => {
		const options = {
			localDir: "./test",
			remoteDir: "/site/wwwroot",
			host: "ssh.example.com",
			user: "user",
			password: "password",
			mode: "ssh" as const,
			entries: ["index.html"],
		};

		const uploader = new FtpUpload(options);
		await uploader.execute();

		expect(SftpClient).toHaveBeenCalled();
		expect(mockSftpClient.connect).toHaveBeenCalledWith(
			expect.objectContaining({
				host: "ssh.example.com",
				username: "user",
				password: "password",
				port: 22,
			}),
		);
		expect(mockSftpClient.put).toHaveBeenCalled();
		expect(mockSftpClient.end).toHaveBeenCalled();
	});

	it("should call progress callback during upload", async () => {
		const progressCallback = vi.fn();
		const options = {
			localDir: "./test",
			remoteDir: "/site/wwwroot",
			host: "ftp.example.com",
			user: "user",
			password: "password",
			mode: "ftp" as const,
			entries: ["index.html"],
			progress: progressCallback,
		};

		const uploader = new FtpUpload(options);
		await uploader.execute();

		expect(progressCallback).toHaveBeenCalled();
		// Verify that the callback was called with the correct arguments including percent
		expect(progressCallback).toHaveBeenCalledWith(
			expect.objectContaining({
				uploadedBytes: expect.any(Number),
				totalBytes: expect.any(Number),
				currentFile: expect.any(String),
				percent: expect.any(Number),
			}),
		);
	});
});
