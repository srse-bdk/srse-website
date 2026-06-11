import type { Student } from "@/lib/types/student.type";
import type { User } from "@/lib/types/user.type";

export const ID_CARD_SAMPLE_STUDENT: Student = {
  id: "sample-student",
  scanId: "STU-SAMPLE01",
  admissionNumber: "ADM-001",
  admissionDate: "2024-04-01",
  firstName: "Sample",
  lastName: "Student",
  fullName: "Sample Student",
  dateOfBirth: "2019-05-15",
  gender: "female",
  bloodGroup: "B+",
  address: {
    street: "Acharya Nagar",
    city: "Bhadrak",
    state: "Odisha",
    pincode: "756100",
  },
  guardians: [
    {
      id: "g1",
      relationship: "father",
      name: "Mr. Sample Parent",
      phone: "9438465475",
      isPrimary: true,
    },
  ],
  documents: [],
  status: "active",
  currentClass: "Nursery",
  currentSection: "A",
  createdAt: "",
  updatedAt: "",
};

export const ID_CARD_SAMPLE_STAFF: User = {
  id: "sample-staff",
  uid: "sample-staff",
  scanId: "STF-SAMPLE01",
  name: "Sample Teacher",
  email: "teacher@school.com",
  status: "active",
  password: "",
  role: "staff",
  staffType: "teaching",
  position: "Teacher",
  bloodGroup: "O+",
  phoneNumber: "9437530949",
  createdAt: "",
  updatedAt: "",
};
