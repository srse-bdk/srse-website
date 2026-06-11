import { mutate } from "@atechhub/firebase";
import { parentService } from "@/lib/services/parent.service";
import { staffService } from "@/lib/services/staff.service";
import { studentService } from "@/lib/services/student.service";
import { deleteUploadThingFile } from "@/lib/utils/profile-photo";

class ProfilePhotoService {
  private async syncParentProfilePhotosForStudent(
    studentId: string,
  ): Promise<void> {
    const [parents, students] = await Promise.all([
      parentService.getAll(),
      studentService.getAll(),
    ]);

    const studentById = new Map(students.map((student) => [student.id, student]));

    for (const parent of parents) {
      const childIds = parent.validChildrenIds || [];
      if (!childIds.includes(studentId)) continue;

      const primaryChild = studentById.get(childIds[0]);
      if (!primaryChild?.profilePicture) continue;

      await parentService.update(parent.uid, {
        profilePicture: primaryChild.profilePicture,
        profilePictureFileKey: primaryChild.profilePictureFileKey,
      });
    }
  }
  async updateStudentProfilePhoto(
    studentId: string,
    profilePicture: string,
    profilePictureFileKey: string,
  ): Promise<void> {
    const student = await studentService.getById(studentId);
    if (!student) {
      throw new Error("Student not found");
    }

    if (
      student.profilePictureFileKey &&
      student.profilePictureFileKey !== profilePictureFileKey
    ) {
      await deleteUploadThingFile(student.profilePictureFileKey);
    }

    await studentService.update(studentId, {
      profilePicture,
      profilePictureFileKey,
    });
  }

  async updateStaffProfilePhoto(
    staffId: string,
    profilePicture: string,
    profilePictureFileKey: string,
  ): Promise<void> {
    const staff = await staffService.getById(staffId);
    if (!staff) {
      throw new Error("Staff not found");
    }

    if (
      staff.profilePictureFileKey &&
      staff.profilePictureFileKey !== profilePictureFileKey
    ) {
      await deleteUploadThingFile(staff.profilePictureFileKey);
    }

    await staffService.update(staffId, {
      profilePicture,
      profilePictureFileKey,
    });
  }

  /** Refresh linked parent account avatars after a student photo change. */
  async refreshParentPhotosForStudent(studentId: string): Promise<void> {
    await this.syncParentProfilePhotosForStudent(studentId);
  }

  async clearStudentProfilePhoto(studentId: string): Promise<void> {
    const student = await studentService.getById(studentId);
    if (!student) return;

    await deleteUploadThingFile(student.profilePictureFileKey);

    await studentService.update(studentId, {
      profilePicture: undefined,
      profilePictureFileKey: undefined,
    });

    await this.syncParentProfilePhotosForStudent(studentId);
  }

  async clearStaffProfilePhoto(staffId: string): Promise<void> {
    const staff = await staffService.getById(staffId);
    if (!staff) return;

    await deleteUploadThingFile(staff.profilePictureFileKey);

    await staffService.update(staffId, {
      profilePicture: undefined,
      profilePictureFileKey: undefined,
    });
  }

  /** Staff self-service via settings — also updates live session user. */
  async updateCurrentUserProfilePhoto(
    uid: string,
    profilePicture: string,
    profilePictureFileKey: string,
    previousFileKey?: string | null,
  ): Promise<void> {
    if (previousFileKey && previousFileKey !== profilePictureFileKey) {
      await deleteUploadThingFile(previousFileKey);
    }

    await mutate({
      action: "update",
      path: `users/${uid}`,
      data: {
        profilePicture,
        profilePictureFileKey,
      },
      actionBy: "admin",
    });
  }
}

export const profilePhotoService = new ProfilePhotoService();
